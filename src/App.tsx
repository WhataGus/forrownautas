import { useEffect, useRef, useState } from "react";
import { DAMAGE_TYPE } from "../shared/damage-types.js";
import {
  applyTrackedDamage,
  createFrontendMatch,
  damagePayloadFrom,
  projectCommanderDamage,
  startingSeatOf,
} from "../game/frontend-adapter.js";
import { canSubmitSave, submitMatchRequest } from "../game/save-flow.js";
import { fetchRoster } from "../game/roster.js";
import { applyExtort } from "../game/extort.js";
import type { RosterPlayer, SaveState, TrackerPlayer } from "./types";

        const IconMinus = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
        const IconPlus = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
        const IconSwords = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline><line x1="5" y1="14" x2="9" y2="10"></line><line x1="4" y1="20" x2="8" y2="16"></line><line x1="3" y1="21" x2="5" y2="19"></line></svg>;
        const IconRotate = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>;
        const IconClock = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
        const IconSkull = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><path d="M8 20v2h8v-2"></path><path d="m12.5 17-.5-1-.5 1h1z"></path><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"></path></svg>;
        const IconZap = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
        const IconX = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
        const IconHeart = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
        const IconDroplet = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>;
        const IconPlay = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
        const IconPause = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
        const IconTrophy = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>;

        const PRESET_COLORS = [
          { color: 'border-yellow-600', textColor: 'text-[#2c2b29]', bgColor: '#e6d8b6', btnClass: 'bg-black/10 border-black/10 hover:bg-black/20 text-[#2c2b29]' },
          { color: 'border-cyan-400', textColor: 'text-white', bgColor: '#245866', btnClass: 'bg-black/20 border-white/10 hover:bg-black/40 text-white' },
          { color: 'border-purple-400', textColor: 'text-white', bgColor: '#262234', btnClass: 'bg-black/30 border-white/10 hover:bg-black/50 text-white' },
          { color: 'border-orange-400', textColor: 'text-white', bgColor: '#954a32', btnClass: 'bg-black/20 border-white/10 hover:bg-black/40 text-white' },
          { color: 'border-emerald-400', textColor: 'text-white', bgColor: '#1e4630', btnClass: 'bg-black/20 border-white/10 hover:bg-black/40 text-white' },
          { color: 'border-rose-400', textColor: 'text-white', bgColor: '#582424', btnClass: 'bg-black/20 border-white/10 hover:bg-black/40 text-white' }
        ];

        const WIN_CONDITIONS = ['Combate', 'Dano de Comandante', 'Dano Não-Combate', 'Combo', 'Veneno', 'Mill (Deck Acabou)', 'Condição Alternativa'];

        const getQuadrantPadding = (idx) => {
          const base = "relative rounded-xl overflow-hidden transition-all duration-300";
          switch(idx) {
            case 0: return `${base} p-2 md:p-6 pr-[20px] [@media(max-height:600px)]:pr-[20px] md:pr-[20px] pb-[40px] [@media(max-height:600px)]:pb-[15px] md:pb-[90px]`;
            case 1: return `${base} p-2 md:p-6 pl-[60px] [@media(max-height:600px)]:pl-[80px] md:pl-[20px] pb-[40px] [@media(max-height:600px)]:pb-[15px] md:pb-[20px]`;
            case 2: return `${base} p-2 md:p-6 pr-[60px] [@media(max-height:600px)]:pr-[80px] md:pr-[20px] pt-[40px] [@media(max-height:600px)]:pt-[15px] md:pt-[20px]`;
            case 3: return `${base} p-2 md:p-6 pl-[60px] [@media(max-height:600px)]:pl-[80px] md:pl-[20px] pt-[40px] [@media(max-height:600px)]:pt-[15px] md:pt-[90px]`;
            default: return `${base} p-6`;
          }
        };

        const getInitials = (name) => {
          if (!name) return '??';
          const words = name.trim().split(' ');
          if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
          return name.substring(0, 2).toUpperCase();
        };

        function App() {
          const [gameStage, setGameStage] = useState('setup');
          const [registeredRoster, setRegisteredRoster] = useState<RosterPlayer[]>([]);

          const [numPlayers, setNumPlayers] = useState(4);
          const [startingLife, setStartingLife] = useState(40);
          
          const [players, setPlayers] = useState<TrackerPlayer[]>([
            { id: 'p1', userId: '', name: 'Gustavo', deckId: '', commander: 'Criatura Verde', life: 40, tax: 0, poison: 0, mulligans: 0, isDead: false, commanderDamage: {}, ...PRESET_COLORS[0] },
            { id: 'p2', userId: '', name: 'Guest 1', deckId: '', commander: 'Alado', life: 40, tax: 0, poison: 0, mulligans: 0, isDead: false, commanderDamage: {}, ...PRESET_COLORS[1] },
            { id: 'p4', userId: '', name: 'Guest 3', deckId: '', commander: 'Guerreiro', life: 40, tax: 0, poison: 0, mulligans: 0, isDead: false, commanderDamage: {}, ...PRESET_COLORS[3] },
            { id: 'p3', userId: '', name: 'Guest 2', deckId: '', commander: 'Mago Sombrio', life: 40, tax: 0, poison: 0, mulligans: 0, isDead: false, commanderDamage: {}, ...PRESET_COLORS[2] }
          ]);

          const [newUserName, setNewUserName] = useState('');
          const [newDeckNames, setNewDeckNames] = useState({});

          const [matchTime, setMatchTime] = useState(0);
          const [turnTime, setTurnTime] = useState(0);
          const [turnNumber, setTurnNumber] = useState(1);
          const [activePlayerIdx, setActivePlayerIdx] = useState(0);
          const [startingPlayerIdx, setStartingPlayerIdx] = useState(null);
          const [isPaused, setIsPaused] = useState(false);

          const [activeEffectPlayerId, setActiveEffectPlayerId] = useState(null);
          const [effectValue, setEffectValue] = useState(1);

          const [attackState, setAttackState] = useState({ isAttacking: false, attackerId: null, startPos: null, currentPos: null });
          const [damageModal, setDamageModal] = useState({ isOpen: false, attackerId: null, targetId: null, isLifelink: false, isInfect: false });
          const [damageInput, setDamageInput] = useState(1);
          const [damageType, setDamageType] = useState('combat');
          
          const [pendingEliminations, setPendingEliminations] = useState([]);
          const currentElimination = pendingEliminations.length > 0 ? pendingEliminations[0] : null;

          const [startModalOpen, setStartModalOpen] = useState(false);
          const [selectedStartingId, setSelectedStartingId] = useState(null);
          
          const [resetPromptOpen, setResetPromptOpen] = useState(false);

          const [endGameWinners, setEndGameWinners] = useState([]);
          const [endGameWinCon, setEndGameWinCon] = useState('Combate');
          const [endGameInfinite, setEndGameInfinite] = useState(false);
          const [saveState, setSaveState] = useState<SaveState>({ status: 'idle', error: null });
          const [domainError, setDomainError] = useState(null);

          const quadrantRefs = useRef<Record<string, HTMLElement | null>>({});
          const prevPlayersRef = useRef(players);
          const canonicalMatchRef = useRef(null);
          const saveInFlightRef = useRef(false);

          // Códigos de tipo de dano — precisam bater com DAMAGE_TYPE em db/constants.ts
          const { COMBAT: DMG_COMBAT, COMMANDER: DMG_COMMANDER, INFECT: DMG_INFECT, NONCOMBAT: DMG_NONCOMBAT } = DAMAGE_TYPE;

          // Acumuladores da partida. Ficam num ref (e não no state dos jogadores)
          // para não disparar re-render a cada ponto de dano registrado.
          const matchStatsRef = useRef({ lifeGained: {}, eliminations: {} });

          const resetMatchStats = () => {
            matchStatsRef.current = { lifeGained: {}, eliminations: {} };
          };

          const setCanonicalError = () => setDomainError('Regras da partida não estão disponíveis. Tente novamente.');
          const initializeCanonicalMatch = (startingSeat) => {
            canonicalMatchRef.current = createFrontendMatch(players, startingSeat, startingLife);
            setDomainError(null);
            return true;
          };
          const applyCanonicalDamage = (damage) => {
            if (!canonicalMatchRef.current) { setCanonicalError(); return false; }
            canonicalMatchRef.current = applyTrackedDamage(canonicalMatchRef.current, damage);
            setPlayers(prev => projectCommanderDamage(canonicalMatchRef.current, prev));
            setDomainError(null);
            return true;
          };
          const correctCommanderDamage = (sourceId, targetId) => {
            applyCanonicalDamage({ sourceId, targetId, damageType: DMG_COMMANDER, amount: -1 });
          };

          const recordLifeGain = (playerId, amount) => {
            if (!playerId || amount <= 0) return;
            const acc = matchStatsRef.current.lifeGained;
            acc[playerId] = (acc[playerId] || 0) + amount;
          };

          // CARREGAMENTO DE JOGADORES E DECKS DO BANCO DE DADOS
          useEffect(() => {
            async function loadRoster() {
              try {
                const roster = await fetchRoster(fetch);

                setRegisteredRoster(roster);

                setPlayers(prev => prev.map((p, i) => {
                  const user = roster[i % roster.length];
                  const deck = user?.decks[0];
                  return {
                    ...p,
                    userId: user ? user.id : '',
                    name: user ? user.name : p.name,
                    deckId: deck ? deck.id : '',
                    commander: deck ? deck.name : p.commander
                  };
                }));
              } catch (err) {
                console.error("Erro ao carregar players:", err);
              }
            }
            loadRoster();
          }, []);

          // Cronômetro
          useEffect(() => {
            if (gameStage !== 'playing' || isPaused) return;
            const interval = setInterval(() => {
              setMatchTime(prev => prev + 1);
              setTurnTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
          }, [gameStage, isPaused]);

          // Observador de Eliminações
          useEffect(() => {
            const newlyDead = [];
            players.forEach(newP => {
                if (newP.isDead) return;
                const oldP = prevPlayersRef.current.find(p => p.id === newP.id);
                if (!oldP) return;

                let reason = null;
                if (oldP.life > 0 && newP.life <= 0) reason = 'Vida chegou a 0';
                else if (oldP.poison < 10 && newP.poison >= 10) reason = '10 marcadores de Veneno';
                else if (!(Object.values(oldP.commanderDamage || {}) as number[]).some(d => d >= 21) && (Object.values(newP.commanderDamage || {}) as number[]).some(d => d >= 21)) reason = '21 Dano de Comandante';

                if (reason) newlyDead.push({ playerId: newP.id, reason });
            });

            if (newlyDead.length > 0) {
                setPendingEliminations(prev => {
                    const toAdd = newlyDead.filter(nd => !prev.some(p => p.playerId === nd.playerId));
                    return [...prev, ...toAdd];
                });
            }
            prevPlayersRef.current = players;
          }, [players]);

          const handleInteractionFullscreen = () => {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          };

          const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          };

          const handleNumPlayersChange = (n) => {
            setNumPlayers(n);
            let updated = [];
            for (let i = 0; i < n; i++) {
              const defaultUser = registeredRoster[i % registeredRoster.length];
              const defaultDeck = defaultUser?.decks[0];
              updated.push({
                id: `p${i+1}`,
                userId: defaultUser ? defaultUser.id : `usr_${i}`,
                name: defaultUser ? defaultUser.name : `Player ${i+1}`,
                deckId: defaultDeck ? defaultDeck.id : `deck_${i}`,
                commander: defaultDeck ? defaultDeck.name : `Deck ${i+1}`,
                life: startingLife,
                tax: 0,
                poison: 0,
                mulligans: 0,
                isDead: false,
                commanderDamage: {},
                ...PRESET_COLORS[i % PRESET_COLORS.length]
              });
            }
            setPlayers(updated);
          };

          const handleStartingLifeChange = (life) => {
            setStartingLife(life);
            setPlayers(prev => prev.map(p => ({ ...p, life })));
          };

          const addNewUser = async () => {
            if (!newUserName.trim()) return;
            try {
              const newUser = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newUserName.trim(), deckName: 'Deck Principal' })
              }).then(r => r.json());
              setRegisteredRoster([...registeredRoster, newUser]);
              setNewUserName('');
            } catch (err) {
              alert("Erro ao cadastrar jogador: " + err.message);
            }
          };

          const addDeckToUser = async (userId, deckName) => {
            if (!deckName.trim()) return;

            try {
              const newDeck = await fetch('/api/decks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: userId, name: deckName.trim() })
              }).then(r => r.json());

              setRegisteredRoster(registeredRoster.map(user => {
                if (user.id === userId) {
                  return { ...user, decks: [...user.decks, newDeck] };
                }
                return user;
              }));
              setNewDeckNames({...newDeckNames, [userId]: ''});
            } catch (err) {
              alert("Erro ao salvar deck no banco: " + err.message);
            }
          };

          const deleteUser = async (userId) => {
            setRegisteredRoster(registeredRoster.filter(u => u.id !== userId));
            await fetch(`/api/players?id=${userId}`, { method: 'DELETE' });
          };

          const deleteDeck = async (userId, deckId) => {
            setRegisteredRoster(registeredRoster.map(user => {
              if (user.id === userId) {
                return { ...user, decks: user.decks.filter(d => d.id !== deckId) };
              }
              return user;
            }));
            await fetch(`/api/decks?id=${deckId}`, { method: 'DELETE' });
          };

          const handleSelectUser = (quadrantIdx, userId) => {
            const selectedUser = registeredRoster.find(u => u.id === userId);
            if (!selectedUser) return;
            const firstDeck = selectedUser.decks[0] || { id: '', name: 'Sem Deck' };

            setPlayers(prev => prev.map((p, i) => {
              if (i === quadrantIdx) {
                return {
                  ...p,
                  userId: selectedUser.id,
                  name: selectedUser.name,
                  deckId: firstDeck.id,
                  commander: firstDeck.name
                };
              }
              return p;
            }));
          };

          const handleSelectDeck = (quadrantIdx, deckId) => {
            const player = players[quadrantIdx];
            const user = registeredRoster.find(u => u.id === player.userId);
            if (!user) return;
            const deck = user.decks.find(d => d.id === deckId);
            if (!deck) return;

            setPlayers(prev => prev.map((p, i) => {
              if (i === quadrantIdx) {
                return {
                  ...p,
                  deckId: deck.id,
                  commander: deck.name
                };
              }
              return p;
            }));
          };

          const validateSelectedParticipants = () => {
            if (players.some(p => !p.userId || !p.deckId)) return 'Selecione um jogador e um deck para cada espaço.';
            if (new Set(players.map(p => p.userId)).size !== players.length) return 'O mesmo jogador não pode participar duas vezes.';
            return null;
          };

          const CLOCKWISE_GRID_MAP = [0, 1, 3, 2];

          const handlePassTurn = () => {
            setTurnTime(0);
            setActivePlayerIdx((prev) => {
              const activeGridIdx = players.findIndex(p => p.id === players[prev].id);
              let clockPos = CLOCKWISE_GRID_MAP.indexOf(activeGridIdx);
              let nextClockPos = (clockPos + 1) % numPlayers;
              let nextGridIdx = CLOCKWISE_GRID_MAP[nextClockPos];
              let loops = 0;

              while (players[nextGridIdx].isDead && loops < numPlayers) {
                clockPos = nextClockPos;
                nextClockPos = (clockPos + 1) % numPlayers;
                nextGridIdx = CLOCKWISE_GRID_MAP[nextClockPos];
                loops++;
              }

              if (nextClockPos === 0) {
                setTurnNumber(t => t + 1);
              }
              return nextGridIdx;
            });
          };

          const updateLife = (id, amount) => {
            if (amount > 0) recordLifeGain(id, amount);
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, life: p.life + amount } : p));
          };

          const updatePoison = (id, amount) => {
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, poison: Math.max(0, p.poison + amount) } : p));
          };

          const updateTax = (id, amount) => {
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, tax: Math.max(0, p.tax + amount) } : p));
          };

          const updateMulligan = (id, amount) => {
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, mulligans: Math.max(0, p.mulligans + amount) } : p));
          };

          const revivePlayer = (id) => {
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, isDead: false, life: Math.max(1, p.life) } : p));
          };

          const closeMassEffect = () => {
             setActiveEffectPlayerId(null);
             setEffectValue(1);
          };

          const applyMassEffect = (type) => {
            const sourceId = activeEffectPlayerId;
            const X = effectValue;

            if (type === 'extort') {
              const result = applyExtort(players, sourceId, X);
              setPlayers(result.players);
              recordLifeGain(sourceId, result.controllerLifeGain);
              closeMassEffect();
              return;
            }
            
            setPlayers(prev => {
              return prev.map(p => {
                if (p.isDead) return p;
                let newLife = p.life;
                if (type === 'all_players') newLife -= X;
                else if (type === 'all_opponents' && p.id !== sourceId) newLife -= X;
                else if (type === 'drain') {
                  if (p.id !== sourceId) newLife -= X;
                  else newLife += X;
                }
                return { ...p, life: newLife };
              });
            });
            closeMassEffect();
          };

          const getCenter = (el) => {
            if (!el) return { x: 0, y: 0 };
            const rect = el.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          };

          const handleStartAttack = (attackerId, e) => {
            if(e.button && e.button !== 0) return;
            const attacker = players.find(p => p.id === attackerId);
            if (attacker.isDead) return;

            const attackerEl = quadrantRefs.current[attackerId];
            if (!attackerEl) return;
            setAttackState({
              isAttacking: true,
              attackerId,
              startPos: getCenter(attackerEl),
              currentPos: { x: e.clientX, y: e.clientY }
            });
          };

          const handlePointerMove = (e) => {
            if (!attackState.isAttacking) return;
            setAttackState(prev => ({ ...prev, currentPos: { x: e.clientX, y: e.clientY } }));
          };

          const handlePointerUp = (e) => {
            if (!attackState.isAttacking) return;
            let targetId = null;
            Object.entries(quadrantRefs.current).forEach(([id, el]) => {
              if (id === attackState.attackerId || !el) return;
              const targetPlayer = players.find(p => p.id === id);
              if (targetPlayer.isDead) return;

              const rect = el.getBoundingClientRect();
              if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                targetId = id;
              }
            });

            if (targetId) {
              setDamageModal({ isOpen: true, attackerId: attackState.attackerId, targetId, isLifelink: false, isInfect: false });
              setDamageInput(1);
            }
            setAttackState({ isAttacking: false, attackerId: null, startPos: null, currentPos: null });
          };

          const confirmDamage = () => {
            // Registrado antes do setPlayers: o updater do React pode rodar duas
            // vezes em StrictMode, o que dobraria a contagem se ficasse lá dentro.
            const dmgCode = damageModal.isInfect
              ? DMG_INFECT
              : (damageType === 'commander' ? DMG_COMMANDER : DMG_COMBAT);
            if (!applyCanonicalDamage({ sourceId: damageModal.attackerId, targetId: damageModal.targetId, damageType: dmgCode, amount: damageInput })) return;
            if (damageModal.isLifelink) recordLifeGain(damageModal.attackerId, damageInput);

            setPlayers(prev => {
              return prev.map(p => {
                if (p.id === damageModal.attackerId && damageModal.isLifelink) {
                   return { ...p, life: p.life + damageInput };
                }
                if (p.id === damageModal.targetId) {
                  let newLife = p.life;
                  let newPoison = p.poison;
                  if (damageModal.isInfect) newPoison += damageInput;
                  else newLife -= damageInput;

                  const newCmdDmg = { ...(p.commanderDamage || {}) };
                  if (damageType === 'commander') {
                    newCmdDmg[damageModal.attackerId] = (newCmdDmg[damageModal.attackerId] || 0) + damageInput;
                  }
                  return { ...p, life: newLife, poison: newPoison, commanderDamage: newCmdDmg };
                }
                return p;
              });
            });
            setDamageModal({ isOpen: false, attackerId: null, targetId: null, isLifelink: false, isInfect: false });
          };

          const confirmElimination = (id) => {
             const pending = pendingEliminations.find(e => e.playerId === id);
             matchStatsRef.current.eliminations[id] = {
               atSeconds: matchTime,
               reason: pending ? pending.reason : null
             };
             setPlayers(prev => prev.map(p => p.id === id ? { ...p, isDead: true } : p));
             setPendingEliminations(prev => prev.slice(1));
          };

          const rejectElimination = () => {
             setPendingEliminations(prev => prev.slice(1));
          };

          const startRandomPlayer = () => {
            const aliveIndices = players.map((p, idx) => idx);
            const randomIndex = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
            if (!initializeCanonicalMatch(randomIndex)) return;
            setActivePlayerIdx(randomIndex);
            setStartingPlayerIdx(randomIndex);
            setStartModalOpen(false);
            setGameStage('mulligan_phase');
          };

          const startSelectedPlayer = () => {
            if (selectedStartingId !== null) {
              const idx = players.findIndex(p => p.id === selectedStartingId);
              if (idx !== -1) {
                if (!initializeCanonicalMatch(idx)) return;
                setActivePlayerIdx(idx);
                setStartingPlayerIdx(idx);
              }
            }
            setStartModalOpen(false);
            setGameStage('mulligan_phase');
          };

          const finishMulligansAndPlay = () => {
            resetMatchStats();
            setMatchTime(0);
            setTurnTime(0);
            setTurnNumber(1);
            setIsPaused(false);
            setGameStage('playing');
          };

          const triggerEndGame = () => {
             const alivePlayers = players.filter(p => !p.isDead);
             setEndGameWinners(alivePlayers.map(p => p.id));
             setEndGameWinCon('Combate');
             setEndGameInfinite(false);
             setGameStage('end_game');
          };

          const buildMatchPayload = () => {
             const stats = matchStatsRef.current;

             // Colocação: vencedores em 1º; os demais por ordem inversa de
             // eliminação (quem morreu por último fica melhor colocado).
             const losers = players
               .filter(p => !endGameWinners.includes(p.id) && stats.eliminations[p.id])
               .sort((a, b) => (stats.eliminations[b.id]?.atSeconds ?? Infinity) - (stats.eliminations[a.id]?.atSeconds ?? Infinity));
             const placementOf = {};
             players.forEach(p => { if (endGameWinners.includes(p.id)) placementOf[p.id] = 1; });
             losers.forEach((p, i) => { placementOf[p.id] = 2 + i; });

             if (!canonicalMatchRef.current) return null;
             const damage = damagePayloadFrom(canonicalMatchRef.current);

             return {
               durationSeconds: matchTime,
               winCondition: endGameWinCon,
               wentInfinite: endGameInfinite,
               turnCount: turnNumber,
               startingLife,
               startingSeat: startingSeatOf(canonicalMatchRef.current),
               players: players.map(p => ({
                 playerId: p.userId || null,
                 deckId: p.deckId || null,
                 playerName: p.name,
                 deckName: p.commander,
                 isWinner: endGameWinners.includes(p.id),
                 placement: placementOf[p.id] || 0,
                 finalLife: p.life,
                 poisonReceived: p.poison,
                 mulligans: p.mulligans,
                 lifeGained: stats.lifeGained[p.id] || 0,
                 eliminatedAtSeconds: stats.eliminations[p.id]?.atSeconds ?? null,
                 eliminationReason: stats.eliminations[p.id]?.reason ?? null
               })),
               damage
             };
          };

          const confirmEndGameAndReset = async () => {
             if (!canSubmitSave(saveInFlightRef.current)) return;
             const payload = buildMatchPayload();
             if (!payload) { setCanonicalError(); return; }
             saveInFlightRef.current = true;
             setSaveState({ status: 'saving', error: null });
             const result = await submitMatchRequest(fetch, payload);
             if (!result.ok) {
               saveInFlightRef.current = false;
               setSaveState({ status: 'error', error: result.error });
               return;
             }

             resetMatchStats();

             setMatchTime(0);
             setTurnTime(0);
             setTurnNumber(1);
             setIsPaused(false);
             setPendingEliminations([]);
             setStartingPlayerIdx(null);
             canonicalMatchRef.current = null;
             saveInFlightRef.current = false;
             setSaveState({ status: 'idle', error: null });
             setPlayers(prev => prev.map(p => ({
                 ...p, life: startingLife, tax: 0, poison: 0, mulligans: 0, isDead: false, commanderDamage: {}
             })));
             setGameStage('setup');
          };

          // TELA DE SETUP
          if (gameStage === 'setup') {
            return (
              <div onClick={handleInteractionFullscreen} className="w-full h-full bg-[#12141a] text-white flex flex-col relative select-none">
                <div className="flex-1 overflow-y-auto p-6" style={{ touchAction: 'pan-y' }}>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Start game</h1>
                    <div className="flex gap-2">
                      <button onClick={() => setGameStage('roster_manager')} className="bg-[#1c1f28] border border-[#2a2e3d] text-gray-300 text-xs px-4 py-2.5 rounded-xl font-bold hover:bg-[#252936] transition flex items-center gap-2">
                        <span>⚙️ Players</span>
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Number of players</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[2, 3, 4, 5, 6].map(n => (
                        <button key={n} onClick={() => handleNumPlayersChange(n)} className={`py-3 rounded-xl font-bold border transition ${numPlayers === n ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300' : 'bg-[#1c1f28] border-[#2a2e3d] text-gray-300 hover:bg-[#252936]'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Starting life</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[20, 30, 40, 50, 60].map(life => (
                        <button key={life} onClick={() => handleStartingLifeChange(life)} className={`py-3 rounded-xl font-bold border transition ${startingLife === life ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300' : 'bg-[#1c1f28] border-[#2a2e3d] text-gray-300 hover:bg-[#252936]'}`}>
                          {life}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 p-6 pt-4 bg-[#12141a]">
                  <button onClick={() => setGameStage('deck_select')} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-lg text-white shadow-lg transition transform active:scale-95">
                    Next: Select Players & Decks
                  </button>
                </div>
              </div>
            );
          }

          // GERENCIADOR DE PLAYERS E DECKS
          if (gameStage === 'roster_manager') {
            return (
              <div className="w-full h-full bg-[#12141a] text-white flex flex-col relative select-none">
                <div className="flex-1 overflow-y-auto p-6" style={{ touchAction: 'pan-y' }}>
                  <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setGameStage('setup')} className="text-cyan-400 font-bold">&larr; Back</button>
                    <h1 className="text-xl font-bold">Gerenciar Players & Decks</h1>
                    <div className="w-10"></div>
                  </div>

                  <div className="bg-[#1c1f28] border border-[#2a2e3d] rounded-2xl p-4 mb-6 flex gap-2">
                    <input type="text" placeholder="Nome do novo jogador..." value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="flex-1 bg-black/40 border border-[#3a3f52] px-4 py-2 rounded-xl text-sm text-white focus:outline-none"/>
                    <button onClick={addNewUser} className="bg-cyan-700 hover:bg-cyan-600 px-5 py-2 rounded-xl font-bold text-sm transition">Cadastrar</button>
                  </div>

                  <div className="space-y-4 pb-4">
                    {registeredRoster.map(user => {
                      const currentDeckInput = newDeckNames[user.id] || '';
                      return (
                        <div key={user.id} className="bg-[#1c1f28] border border-[#2a2e3d] rounded-2xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="font-black text-lg text-white">{user.name}</h3>
                              <span className="text-[10px] font-mono text-cyan-400">UID: {user.id}</span>
                            </div>
                            <button onClick={() => deleteUser(user.id)} className="text-red-400 hover:text-red-300 text-xs bg-red-950/40 border border-red-900/50 px-3 py-1 rounded-lg transition">Excluir Player</button>
                          </div>

                          <div className="border-t border-[#2a2e3d] pt-3 mt-2">
                            <span className="text-xs text-gray-400 font-bold block mb-2">Decks cadastrados:</span>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {user.decks.map(deck => (
                                <div key={deck.id} className="bg-black/40 border border-[#3a3f52] px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
                                  <span>{deck.name}</span>
                                  <button onClick={() => deleteDeck(user.id, deck.id)} className="text-gray-500 hover:text-red-400">&times;</button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input type="text" placeholder="Nome do novo deck..." value={currentDeckInput} onChange={(e) => setNewDeckNames({...newDeckNames, [user.id]: e.target.value})} className="flex-1 bg-black/40 border border-[#3a3f52] px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none"/>
                              <button onClick={() => addDeckToUser(user.id, currentDeckInput)} className="bg-[#2d303b] hover:bg-[#3d4150] px-3 py-1.5 rounded-lg text-xs font-bold transition">+ Deck</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="shrink-0 p-6 pt-4 bg-[#12141a] border-t border-[#1c1f28]">
                  <button onClick={() => setGameStage('setup')} className="w-full py-4 bg-cyan-700 hover:bg-cyan-600 rounded-2xl font-black text-lg text-white shadow-lg transition">Salvar e Voltar</button>
                </div>
              </div>
            );
          }

          // SELEÇÃO DE DECKS
          if (gameStage === 'deck_select') {
            return (
              <div className="w-full h-full bg-black text-white overflow-hidden relative font-sans select-none flex flex-col">
                <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-1 p-1">
                  {players.map((p, idx) => {
                    const selectedUser = registeredRoster.find(u => u.id === p.userId) || registeredRoster[0];
                    const userDecks = selectedUser ? selectedUser.decks : [];

                    return (
                      <div key={p.id} className={`${getQuadrantPadding(idx)} border-[6px] border-black/20 opacity-95 relative flex flex-col justify-center items-center`} style={{ backgroundColor: p.bgColor }}>
                        <div className={`w-full h-full flex flex-col justify-center transition-transform duration-300 ${idx < 2 ? 'rotate-180' : ''} ${p.textColor}`}>
                          <div className="flex flex-col gap-3 md:gap-4 max-w-full w-[95%] md:w-[70%] mx-auto">
                            <div className="text-center mb-1">
                               <span className="text-[10px] md:text-xs uppercase font-black opacity-50 tracking-widest block mb-1">Quadrante {idx + 1}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] md:text-[10px] uppercase font-bold opacity-70">Jogador</label>
                              <select value={p.userId} onChange={(e) => handleSelectUser(idx, e.target.value)} className="bg-black/10 border border-black/20 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none w-full shadow-inner" style={{ color: 'inherit' }}>
                                {registeredRoster.map(user => (
                                  <option key={user.id} value={user.id} className="bg-gray-900 text-white">{user.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] md:text-[10px] uppercase font-bold opacity-70">Deck</label>
                              <select value={p.deckId} onChange={(e) => handleSelectDeck(idx, e.target.value)} className="bg-black/10 border border-black/20 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-xs md:text-sm font-bold focus:outline-none w-full shadow-inner truncate" style={{ color: 'inherit' }}>
                                {userDecks.map(deck => (
                                  <option key={deck.id} value={deck.id} className="bg-gray-900 text-white">{deck.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 md:gap-4 transform transition-transform">
                  <button onClick={() => { const error = validateSelectedParticipants(); if (error) { setDomainError(error); return; } setDomainError(null); setStartModalOpen(true); setGameStage('starting_player'); }} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black w-20 h-20 md:w-24 md:h-24 rounded-full shadow-[0_0_40px_rgba(6,182,212,0.6)] flex flex-col items-center justify-center transition transform hover:scale-110 active:scale-95 border-4 border-white">
                    <IconPlay size={28} className="translate-x-0.5 fill-current mb-1 md:w-8 md:h-8" />
                    <span className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold">Start</span>
                  </button>
                  <button onClick={() => setGameStage('setup')} className="bg-[#1a1c23] text-gray-300 hover:text-white px-4 py-1.5 md:px-5 md:py-2 rounded-full text-[10px] md:text-xs font-bold border-2 border-[#2d303b] hover:bg-[#2d303b] shadow-xl transition">&larr; Voltar</button>
                  {domainError && <span className="text-red-300 text-xs text-center max-w-40">{domainError}</span>}
                </div>
              </div>
            );
          }

          // MULLIGAN
          if (gameStage === 'mulligan_phase') {
            return (
              <div className="w-full h-full bg-black text-white overflow-hidden relative font-sans select-none flex flex-col">
                <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-1 p-1">
                  {players.map((player, idx) => (
                    <div key={player.id} className={`${getQuadrantPadding(idx)} border-[6px] border-black/20 opacity-95 relative flex flex-col justify-between`} style={{ backgroundColor: player.bgColor }}>
                      <div className={`w-full h-full flex flex-col justify-between transition-transform duration-300 ${idx < 2 ? 'rotate-180' : ''}`}>
                        <div className={`flex justify-between items-start ${player.textColor}`}>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-wider uppercase truncate">{player.name}</h2>
                            <p className="text-xs sm:text-sm italic opacity-70 truncate">{player.commander}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center my-auto">
                          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest opacity-70 mb-1 sm:mb-2">Mulligans</span>
                          <div className="flex items-center gap-2 sm:gap-4 bg-black/30 border border-white/10 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl">
                            <button onClick={() => updateMulligan(player.id, -1)} className="p-1 sm:p-2 hover:bg-white/10 rounded-full transition text-white"><IconMinus size={16}/></button>
                            <span className="text-2xl sm:text-4xl font-black tabular-nums min-w-[2rem] sm:min-w-[3rem] text-center">{player.mulligans}</span>
                            <button onClick={() => updateMulligan(player.id, 1)} className="p-1 sm:p-2 hover:bg-white/10 rounded-full transition text-white"><IconPlus size={16}/></button>
                          </div>
                        </div>
                        <div></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transform transition-transform">
                  <button onClick={finishMulligansAndPlay} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.6)] flex items-center justify-center transition transform hover:scale-110 active:scale-95 border-4 border-white">
                    <IconPlay size={28} className="translate-x-0.5 fill-current" />
                  </button>
                </div>
              </div>
            );
          }

          // TELA FINAL DE ESTATÍSTICAS (END GAME)
          if (gameStage === 'end_game') {
            return (
              <div className="w-full h-full bg-[#1c1f28] text-white flex flex-col p-6 overflow-y-auto" style={{ touchAction: 'pan-y' }}>
                <div className="max-w-xl mx-auto w-full pt-4 md:pt-10">
                  <h1 className="text-3xl font-normal mb-6 text-gray-100">Winner</h1>
                  
                  <div className="flex flex-wrap gap-6 mb-10">
                    {players.map(p => (
                      <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-6 h-6 border-2 border-gray-500 bg-transparent rounded shadow-sm group-hover:border-cyan-400 transition-colors">
                          <input type="checkbox" checked={endGameWinners.includes(p.id)} onChange={(e) => {
                            if (e.target.checked) setEndGameWinners([...endGameWinners, p.id]);
                            else setEndGameWinners(endGameWinners.filter(id => id !== p.id));
                          }} className="opacity-0 absolute inset-0 cursor-pointer" />
                          {endGameWinners.includes(p.id) && <svg className="w-4 h-4 text-cyan-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                        </div>
                        <span className="text-xl text-gray-300 group-hover:text-white transition-colors">{getInitials(p.name)}</span>
                      </label>
                    ))}
                  </div>

                  <h1 className="text-3xl font-normal mb-6 text-gray-100">Win Condition</h1>
                  <div className="flex flex-wrap gap-3 mb-10">
                    {WIN_CONDITIONS.map(wc => (
                      <button key={wc} onClick={() => setEndGameWinCon(wc)} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${endGameWinCon === wc ? 'bg-gray-600 border-gray-400 text-white' : 'bg-transparent border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                        {wc}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mb-10 border-b border-gray-700 pb-10">
                    <span className="text-xl text-gray-300">Winner went infinite</span>
                    <label className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                      <input type="checkbox" checked={endGameInfinite} onChange={(e) => setEndGameInfinite(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-600 appearance-none cursor-pointer transition-all duration-300 z-10"/>
                      <div className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer transition-colors duration-300"></div>
                    </label>
                  </div>

                  <div className="flex flex-col gap-4 mt-8">
                    {saveState.status === 'error' && <p className="text-red-400 text-sm text-center">{saveState.error}</p>}
                    {domainError && <p className="text-amber-400 text-sm text-center">{domainError}</p>}
                    <button onClick={confirmEndGameAndReset} disabled={saveState.status === 'saving'} className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#12141a] font-bold text-lg py-4 rounded-full shadow-lg transition transform active:scale-95">
                      {saveState.status === 'saving' ? 'Saving...' : 'Confirm winners and rate game'}
                    </button>
                    <button onClick={confirmEndGameAndReset} disabled={saveState.status === 'saving'} className="w-full bg-transparent disabled:opacity-50 text-cyan-500 font-bold text-lg py-4 rounded-full hover:bg-cyan-900/20 transition">
                      {saveState.status === 'saving' ? 'Saving...' : 'Confirm winners and skip rating'}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // TELA PRINCIPAL (GAMEPLAY)
          const aliveCount = players.filter(p => !p.isDead).length;
          const showAutoEndGameBtn = gameStage === 'playing' && aliveCount <= 1;

          return (
            <div className="w-full h-full bg-black text-white overflow-hidden relative font-sans select-none" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
              <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-1 p-1">
                {players.map((player, idx) => {
                  const isActive = idx === activePlayerIdx && !isPaused;
                  
                  return (
                    <div key={player.id} ref={el => quadrantRefs.current[player.id] = el} onDoubleClick={() => !player.isDead && setActiveEffectPlayerId(player.id)} onPointerDown={(e) => !player.isDead && handleStartAttack(player.id, e)} className={`${getQuadrantPadding(idx)} ${isActive ? `border-[6px] ${player.color} z-10` : 'border-[6px] border-black/20 opacity-95'} cursor-pointer touch-none relative`} style={{ backgroundColor: player.bgColor }}>
                      {player.isDead && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none">
                            <IconSkull size={48} className="text-red-600 mb-2 opacity-80 sm:w-16 sm:h-16" />
                            <span className="text-2xl sm:text-4xl font-black tracking-widest text-red-500 opacity-90 uppercase">Eliminado</span>
                            <button onClick={(e) => { e.stopPropagation(); revivePlayer(player.id); }} onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} className="mt-4 px-4 py-1.5 border-2 border-gray-600 text-gray-300 rounded-lg text-xs sm:text-sm bg-black/60 pointer-events-auto hover:bg-gray-800 transition-colors">Reviver Jogador</button>
                        </div>
                      )}

                      <div className={`w-full h-full flex flex-col justify-between transition-transform duration-300 ${idx < 2 ? 'rotate-180' : ''} ${player.isDead ? 'opacity-20 pointer-events-none' : ''}`}>
                        <div className={`flex justify-between items-start ${player.textColor}`}>
                          <div className="overflow-hidden">
                            <h2 className="text-xl sm:text-2xl font-bold tracking-wider uppercase truncate">{player.name}</h2>
                            <p className="text-xs sm:text-sm italic opacity-70 truncate">{player.commander}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 sm:gap-6 my-auto flex-grow relative">
                          <button onClick={(e) => { e.stopPropagation(); updateLife(player.id, -1); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="p-2 sm:p-4 rounded-full transition bg-black/20 hover:bg-black/40 text-white">
                            <IconMinus size={24} />
                          </button>
                          
                          <span className={`text-[5.5rem] sm:text-8xl md:text-9xl font-black tabular-nums tracking-tighter leading-none ${player.textColor}`}>
                            {player.life}
                          </span>

                          <button onClick={(e) => { e.stopPropagation(); updateLife(player.id, 1); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="p-2 sm:p-4 rounded-full transition bg-black/20 hover:bg-black/40 text-white">
                            <IconPlus size={24} />
                          </button>
                        </div>

                        <div className="flex justify-between items-end gap-1 sm:gap-2">
                          <div className="flex flex-wrap gap-1 sm:gap-2 items-center max-w-[calc(100%-10px)]">
                            <div className={`flex flex-col items-center rounded-lg p-1 sm:p-2 border ${player.btnClass}`}>
                              <span className="text-[8px] sm:text-[10px] uppercase font-bold opacity-70">Taxa</span>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <button onClick={(e) => { e.stopPropagation(); updateTax(player.id, -2); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="opacity-60 hover:opacity-100"><IconMinus size={10}/></button>
                                <span className="font-bold text-xs sm:text-base">{player.tax}</span>
                                <button onClick={(e) => { e.stopPropagation(); updateTax(player.id, 2); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="opacity-60 hover:opacity-100"><IconPlus size={10}/></button>
                              </div>
                            </div>
                            
                            {(
                              <div className="flex flex-col items-center rounded-lg p-1 sm:p-2 border bg-green-900/30 border-green-500/50 text-green-400">
                                <span className="text-[8px] sm:text-[10px] uppercase font-bold opacity-80 flex items-center gap-1"><IconDroplet size={8}/> Poison</span>
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); updatePoison(player.id, -1); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="opacity-70 hover:opacity-100"><IconMinus size={10}/></button>
                                  <span className="font-bold text-xs sm:text-base">{player.poison}</span>
                                  <button onClick={(e) => { e.stopPropagation(); updatePoison(player.id, 1); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="opacity-70 hover:opacity-100"><IconPlus size={10}/></button>
                                </div>
                              </div>
                            )}

                            {(Object.entries(player.commanderDamage || {}) as Array<[string, number]>).map(([atkId, dmg]) => {
                              if (dmg <= 0) return null;
                              const attacker = players.find(p => p.id === atkId);
                              return (
                                <div key={atkId} onClick={(e) => { e.stopPropagation(); correctCommanderDamage(atkId, player.id); }} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="flex items-center justify-center gap-1 rounded-lg py-0.5 px-2 border cursor-pointer transition-colors bg-red-900/30 border-red-900/50 text-white">
                                  <span className="text-[10px] font-bold opacity-70">{getInitials(attacker?.name)}</span>
                                  <span className="font-bold text-sm leading-none">{dmg}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {domainError && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-red-900/90 text-white text-xs px-3 py-2 rounded-lg">{domainError}</div>}

              {showAutoEndGameBtn && !currentElimination && !damageModal.isOpen && !activeEffectPlayerId && !resetPromptOpen && (
                <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-30 transition-transform">
                  <button onClick={triggerEndGame} className="bg-[#1a1c23] border-2 border-[#2d303b] hover:border-cyan-500 text-white px-5 py-3 md:px-8 md:py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all">
                    <span className="text-xs md:text-sm text-gray-300">Only one player alive</span>
                    <span className="text-sm md:text-base text-cyan-400 font-bold uppercase tracking-wider">End Game</span>
                  </button>
                </div>
              )}

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transform transition-transform">
                <div className="bg-[#1a1c23] border-[4px] border-[#2d303b] p-3 md:p-4 rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center gap-4 md:gap-6">
                  <div className="flex flex-col items-center px-2 md:px-4 hidden md:flex">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Partida</span>
                    <span className="font-mono text-lg md:text-xl">{formatTime(matchTime)}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] md:text-xs text-cyan-400 font-bold uppercase">Turno {turnNumber}</span>
                      {isPaused && <span className="bg-amber-500/20 text-amber-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase">Pausado</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsPaused(!isPaused)} className={`p-3 md:p-4 rounded-full shadow-lg transition border-2 ${isPaused ? 'bg-amber-600 border-amber-400 text-white' : 'bg-cyan-700 border-cyan-500 text-white'}`}>
                        {isPaused ? <IconPlay size={18}/> : <IconPause size={18}/>}
                      </button>
                      
                      {isPaused ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setResetPromptOpen(true); }} className="bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-3 rounded-full shadow-lg transition border-2 border-red-500/50">
                            <IconRotate size={18}/>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); triggerEndGame(); }} className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 px-3 rounded-full shadow-lg transition border-2 border-cyan-500/50">
                            <IconTrophy size={18}/>
                          </button>
                        </>
                      ) : (
                        <button onClick={handlePassTurn} onDoubleClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 px-4 md:py-4 md:px-6 rounded-full shadow-lg transition border-2 border-cyan-500/50 text-sm md:text-base">
                          Passar Turno
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-gray-400">
                      <IconClock size={10} />
                      <span className="font-mono text-xs">{formatTime(turnTime)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center px-2 hidden md:flex">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Ativo</span>
                    <span className="font-bold text-base text-cyan-400 uppercase">{players[activePlayerIdx]?.name}</span>
                  </div>
                </div>
              </div>

              {startModalOpen && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 backdrop-blur-md">
                  <div className="bg-[#1c1f28] border-2 border-[#2d303b] rounded-3xl p-6 shadow-2xl w-[90%] max-w-lg flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-4">
                      <h3 className="text-xl font-black text-white">Select starting player</h3>
                      <button onClick={() => setStartModalOpen(false)} className="text-gray-400 hover:text-white"><IconX size={20}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full mb-6">
                      {players.map(p => (
                        <label key={p.id} onClick={() => setSelectedStartingId(p.id)} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${selectedStartingId === p.id ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300' : 'bg-black/30 border-[#2d303b] text-gray-300'}`}>
                          <input type="radio" name="startingPlayer" checked={selectedStartingId === p.id} onChange={() => setSelectedStartingId(p.id)} className="accent-cyan-500"/>
                          <span className="font-bold truncate text-xs md:text-base">{p.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex w-full gap-2">
                      <button onClick={startRandomPlayer} className="flex-1 py-3 bg-cyan-700/80 hover:bg-cyan-600 rounded-xl font-bold text-white shadow-lg transition">Random</button>
                      <button onClick={startSelectedPlayer} disabled={!selectedStartingId} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition ${selectedStartingId ? 'bg-cyan-700 hover:bg-cyan-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}>Selected</button>
                    </div>
                  </div>
                </div>
              )}

              {attackState.isAttacking && attackState.startPos && attackState.currentPos && (
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-30">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                    </marker>
                  </defs>
                  <line x1={attackState.startPos.x} y1={attackState.startPos.y} x2={attackState.currentPos.x} y2={attackState.currentPos.y} stroke="#ef4444" strokeWidth="8" strokeDasharray="16 16" markerEnd="url(#arrowhead)" className="animate-dash"/>
                </svg>
              )}

              {currentElimination && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                  <div className="bg-[#1a1c23] border-2 border-red-900/50 rounded-2xl p-6 shadow-2xl w-80 flex flex-col items-center text-center">
                    <IconSkull className="text-red-500 mb-3" size={48} />
                    <h3 className="text-xl font-black mb-1 text-white">Jogador Eliminado?</h3>
                    <p className="text-gray-300 text-xs mb-2">O <strong className="text-white">{players.find(p => p.id === currentElimination.playerId)?.name}</strong> atingiu a condição:</p>
                    <div className="bg-red-900/30 text-red-400 px-3 py-1.5 rounded-lg font-bold text-xs mb-6 border border-red-900/50">{currentElimination.reason}</div>
                    <div className="flex w-full gap-2">
                      <button onClick={rejectElimination} className="flex-1 py-2 bg-transparent border-2 border-[#2d303b] rounded-lg font-bold text-gray-300 text-xs">Foi um erro</button>
                      <button onClick={() => confirmElimination(currentElimination.playerId)} className="flex-1 py-2 bg-red-700 hover:bg-red-600 rounded-lg font-bold text-white text-xs">Confirmar</button>
                    </div>
                  </div>
                </div>
              )}

              {resetPromptOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                  <div className="bg-[#1a1c23] border-2 border-red-900/50 rounded-2xl p-6 shadow-2xl w-80 flex flex-col items-center text-center">
                    <IconRotate className="text-red-500 mb-3" size={48} />
                    <h3 className="text-xl font-black mb-1 text-white">Reiniciar Partida?</h3>
                    <p className="text-gray-300 text-xs mb-6">Todo o progresso atual será perdido.</p>
                    <div className="flex w-full gap-2">
                      <button onClick={() => setResetPromptOpen(false)} className="flex-1 py-2 border-2 border-[#2d303b] rounded-lg text-gray-300 text-xs">Cancelar</button>
                      <button onClick={() => { 
                        setResetPromptOpen(false); 
                        resetMatchStats();
                        setMatchTime(0); setTurnTime(0); setTurnNumber(1); setIsPaused(false); setPendingEliminations([]); setStartingPlayerIdx(null); canonicalMatchRef.current = null;
                        setPlayers(prev => prev.map(p => ({...p, life: startingLife, tax: 0, poison: 0, mulligans: 0, isDead: false, commanderDamage: {}})));
                        setGameStage('setup'); 
                      }} className="flex-1 py-2 bg-red-700 rounded-lg font-bold text-white text-xs">Confirmar</button>
                    </div>
                  </div>
                </div>
              )}

              {activeEffectPlayerId && !currentElimination && !resetPromptOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 backdrop-blur-sm p-2" onClick={closeMassEffect}>
                  <div className="bg-[#1a1c23] border-2 border-[#2d303b] rounded-2xl p-4 shadow-2xl w-[98%] max-w-3xl flex flex-col items-center relative" onClick={(e) => e.stopPropagation()}>
                    <div className="w-full flex justify-between items-start mb-4">
                      <div className="w-8"></div>
                      <div className="text-center">
                        <h1 className="text-xl font-black uppercase text-white">{players.find(p => p.id === activeEffectPlayerId)?.name}</h1>
                        <p className="text-[10px] text-gray-400 italic">Efeitos em Massa</p>
                      </div>
                      <button onClick={closeMassEffect} className="text-gray-500 hover:text-white"><IconX size={20}/></button>
                    </div>

                    <div className="flex flex-col items-center bg-black/40 border border-[#2d303b] py-3 px-6 rounded-2xl mb-4">
                      <span className="text-[10px] uppercase text-cyan-400 font-bold mb-2">Definir Valor (X)</span>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setEffectValue(Math.max(1, effectValue - 1))} className="p-2 bg-[#2d303b] rounded-full"><IconMinus size={18}/></button>
                        <span className="text-4xl font-black tabular-nums w-12 text-center text-white">{effectValue}</span>
                        <button onClick={() => setEffectValue(effectValue + 1)} className="p-2 bg-[#2d303b] rounded-full"><IconPlus size={18}/></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                      <button onClick={() => applyMassEffect('all_players')} className="bg-black/30 border border-[#2d303b] p-3 rounded-xl flex items-center justify-between">
                        <div className="text-left"><h3 className="font-bold text-xs text-white">Dano em Todos</h3><p className="text-[9px] text-gray-400">Todos perdem {effectValue}</p></div><IconZap className="text-red-500" size={18} />
                      </button>
                      <button onClick={() => applyMassEffect('all_opponents')} className="bg-black/30 border border-[#2d303b] p-3 rounded-xl flex items-center justify-between">
                        <div className="text-left"><h3 className="font-bold text-xs text-white">Dano em Oponentes</h3><p className="text-[9px] text-gray-400">Oponentes perdem {effectValue}</p></div><IconSwords className="text-red-500" size={18} />
                      </button>
                      <button onClick={() => applyMassEffect('drain')} className="bg-black/30 border border-[#2d303b] p-3 rounded-xl flex items-center justify-between">
                        <div className="text-left"><h3 className="font-bold text-xs text-cyan-400">Drain</h3><p className="text-[9px] text-gray-400">Oponentes -{effectValue} | Você +{effectValue}</p></div><IconHeart className="text-cyan-500" size={18} />
                      </button>
                      <button onClick={() => applyMassEffect('extort')} className="bg-black/30 border border-[#2d303b] p-3 rounded-xl flex items-center justify-between">
                        <div className="text-left"><h3 className="font-bold text-xs text-purple-400">Extort</h3><p className="text-[9px] text-gray-400">Oponentes -{effectValue}</p></div><IconZap className="text-purple-500" size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {damageModal.isOpen && !currentElimination && !resetPromptOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40 backdrop-blur-sm">
                  <div className="bg-[#1a1c23] border-2 border-[#2d303b] rounded-2xl p-5 shadow-2xl w-80 flex flex-col items-center">
                    <IconSkull className="text-red-500 mb-3" size={40} />
                    <h3 className="text-xl font-bold mb-1">Registrar Dano</h3>
                    <p className="text-gray-400 text-xs mb-4 text-center">
                      De <strong className="text-white">{players.find(p => p.id === damageModal.attackerId)?.name}</strong> para <strong className="text-white">{players.find(p => p.id === damageModal.targetId)?.name}</strong>
                    </p>
                    <div className="flex w-full gap-2 mb-4">
                      <button onClick={() => setDamageModal(prev => ({...prev, isLifelink: !prev.isLifelink}))} className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-2 border text-xs ${damageModal.isLifelink ? 'bg-pink-900/30 border-pink-500 text-pink-400' : 'bg-black/40 border-[#2d303b] text-gray-500'}`}>
                        <IconHeart size={14}/> Lifelink
                      </button>
                      <button onClick={() => setDamageModal(prev => ({...prev, isInfect: !prev.isInfect}))} className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-2 border text-xs ${damageModal.isInfect ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-black/40 border-[#2d303b] text-gray-500'}`}>
                        <IconDroplet size={14}/> Infect
                      </button>
                    </div>
                    <div className="flex w-full gap-2 mb-5 bg-black/40 p-1 rounded-lg">
                      <button onClick={() => setDamageType('combat')} className={`flex-1 py-1.5 text-xs rounded-md ${damageType === 'combat' ? 'bg-[#2d303b] text-white font-bold' : 'text-gray-400'}`}>Combate</button>
                      <button onClick={() => setDamageType('commander')} className={`flex-1 py-1.5 text-xs rounded-md ${damageType === 'commander' ? 'bg-red-900/50 text-red-200 font-bold' : 'text-gray-400'}`}>Comandante</button>
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <button onClick={() => setDamageInput(Math.max(1, damageInput - 1))} className="p-2 bg-[#2d303b] rounded-full"><IconMinus size={20}/></button>
                      <span className="text-5xl font-black tabular-nums w-16 text-center">{damageInput}</span>
                      <button onClick={() => setDamageInput(damageInput + 1)} className="p-2 bg-[#2d303b] rounded-full"><IconPlus size={20}/></button>
                    </div>
                    <div className="flex w-full gap-2">
                      <button onClick={() => setDamageModal({ isOpen: false, attackerId: null, targetId: null, isLifelink: false, isInfect: false })} className="flex-1 py-2 border border-[#2d303b] rounded-lg font-bold text-xs text-white">Cancelar</button>
                      <button onClick={confirmDamage} className="flex-1 py-2 bg-red-700 hover:bg-red-600 rounded-lg font-bold text-white shadow-lg text-xs flex items-center justify-center gap-2">
                        <IconSwords size={16} /> Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }

export default App;
