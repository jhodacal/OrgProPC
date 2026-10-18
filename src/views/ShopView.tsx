import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Coins,
  Shield,
  Zap,
  Award,
  Sparkles,
  Check,
  Lock,
  Crown,
  Flame,
  ArrowUpCircle,
  Plus,
  Pencil,
  Trash2,
  Gift
} from 'lucide-react';
import StorageService, { SHOP_ITEMS, AVATARS } from '../services/StorageService';
import { RPGStats, RPGCosmetics, RPGInventory, Achievement, ShopItem, CustomReward } from '../types';
import { THEMES } from '../styles/theme';
import confetti from 'canvas-confetti';
import AudioService from '../services/AudioService';
import ConfirmModal from '../components/ConfirmModal';

export const ShopView: React.FC = () => {
  const [stats, setStats] = useState<RPGStats | null>(null);
  const [cosmetics, setCosmetics] = useState<RPGCosmetics | null>(null);
  const [inventory, setInventory] = useState<RPGInventory | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [customRewards, setCustomRewards] = useState<CustomReward[]>([]);
  const [activeTab, setActiveTab] = useState<'shop' | 'gear' | 'custom' | 'achievements'>('shop');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Custom Reward Modal & Confirmation states
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardCost, setRewardCost] = useState('50');
  const [rewardIcon, setRewardIcon] = useState('🎁');
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

  const [pendingRewardUpdate, setPendingRewardUpdate] = useState<{ id: string; payload: Partial<CustomReward> } | null>(null);
  const [confirmDeleteReward, setConfirmDeleteReward] = useState<CustomReward | null>(null);
  const [confirmClaimReward, setConfirmClaimReward] = useState<CustomReward | null>(null);

  const loadData = async () => {
    const [s, c, inv, a, cr] = await Promise.all([
      StorageService.getRPGStats(),
      StorageService.getRPGCosmetics(),
      StorageService.getRPGInventory(),
      StorageService.getAchievements(),
      StorageService.getCustomRewards()
    ]);
    setStats(s);
    setCosmetics(c);
    setInventory(inv);
    setAchievements(a);
    setCustomRewards(cr);
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.on('RPG_STATS_UPDATED', loadData);
    const unsubCos = StorageService.on('COSMETICS_UPDATED', loadData);
    const unsubCustom = StorageService.on('CUSTOM_REWARDS_UPDATED', loadData);
    return () => {
      unsub();
      unsubCos();
      unsubCustom();
    };
  }, []);

  const handleBuy = async (item: ShopItem) => {
    const res = await StorageService.buyShopItem(item);
    setFeedback(res.message);
    if (res.success) {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    }
    loadData();
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEquipAvatar = async (avatar: string) => {
    if (!cosmetics) return;
    const updated = { ...cosmetics, equippedAvatar: avatar };
    await StorageService.saveRPGCosmetics(updated);
    setCosmetics(updated);
  };

  const handleEquipTheme = async (themeName: string) => {
    if (!cosmetics) return;
    const updated = { ...cosmetics, equippedTheme: themeName };
    await StorageService.saveRPGCosmetics(updated);
    setCosmetics(updated);
  };

  const isUnlocked = (item: ShopItem) => {
    if (!cosmetics) return false;
    if (item.type === 'sword') return (cosmetics.unlockedSwords || []).includes(item.id);
    if (item.type === 'shield') return (cosmetics.unlockedShields || []).includes(item.id);
    if (item.type === 'helmet') return (cosmetics.unlockedHelmets || []).includes(item.id);
    return false;
  };

  const isEquipped = (item: ShopItem) => {
    if (!cosmetics) return false;
    if (item.type === 'sword') return cosmetics.equippedSword === item.id;
    if (item.type === 'shield') return cosmetics.equippedShield === item.id;
    if (item.type === 'helmet') return cosmetics.equippedHelmet === item.id;
    return false;
  };

  // Custom Rewards Handlers
  const handleOpenCreateReward = () => {
    setEditingRewardId(null);
    setRewardTitle('');
    setRewardDescription('');
    setRewardCost('50');
    setRewardIcon('🎁');
    setIsRewardModalOpen(true);
  };

  const handleOpenEditReward = (reward: CustomReward) => {
    setEditingRewardId(reward.id);
    setRewardTitle(reward.title);
    setRewardDescription(reward.description || '');
    setRewardCost(String(reward.cost));
    setRewardIcon(reward.icon || '🎁');
    setIsRewardModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle.trim()) return;

    const payload = {
      title: rewardTitle.trim(),
      description: rewardDescription.trim(),
      cost: Math.max(1, Number(rewardCost) || 50),
      icon: rewardIcon.trim() || '🎁'
    };

    if (editingRewardId) {
      setPendingRewardUpdate({
        id: editingRewardId,
        payload
      });
    } else {
      await StorageService.saveCustomReward(payload);
      AudioService.playLevelUp();
      setIsRewardModalOpen(false);
      await loadData();
    }
  };

  const handleConfirmRewardUpdate = async () => {
    if (!pendingRewardUpdate) return;
    await StorageService.updateCustomReward(pendingRewardUpdate.id, pendingRewardUpdate.payload);
    AudioService.playCheck();
    setPendingRewardUpdate(null);
    setEditingRewardId(null);
    setIsRewardModalOpen(false);
    await loadData();
  };

  const handleConfirmDeleteReward = async () => {
    if (!confirmDeleteReward) return;
    await StorageService.deleteCustomReward(confirmDeleteReward.id);
    AudioService.playDelete();
    setConfirmDeleteReward(null);
    await loadData();
  };

  const handleConfirmClaimReward = async () => {
    if (!confirmClaimReward) return;
    const res = await StorageService.claimCustomReward(confirmClaimReward.id);
    setFeedback(res.message);
    if (res.success) {
      confetti({ particleCount: 70, spread: 90, origin: { y: 0.6 } });
      AudioService.playLevelUp();
    }
    setConfirmClaimReward(null);
    await loadData();
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header with Hero Balances */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-purple-900/20 to-primary/20 border border-white/10 backdrop-blur-xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-amber-400" /> Tienda RPG & Recompensas
          </h1>
          <p className="text-xs text-gray-300">
            Adquiere armas, escudos, multiplicadores de XP y canjea tus propias recompensas de la vida real con oro.
          </p>
        </div>

        {/* Balance Card */}
        <div className="flex items-center gap-4 bg-black/40 px-5 py-3 rounded-2xl border border-amber-500/30">
          <Coins className="w-8 h-8 text-amber-400 animate-bounce" />
          <div>
            <span className="text-xs font-bold text-gray-400 block uppercase">Tu Saldo de Oro</span>
            <span className="text-2xl font-black text-amber-300 font-mono leading-none">
              {stats?.coins || 0}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-primary/20 border border-primary/40 text-center text-xs font-bold text-white animate-scaleIn">
          {feedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'shop', label: 'Tienda de Ítems & Armas', icon: ShoppingBag },
            { id: 'custom', label: 'Mis Recompensas Reales', icon: Gift, count: customRewards.length },
            { id: 'gear', label: 'Avatares & Temas', icon: Crown },
            { id: 'achievements', label: 'Logros Desbloqueados', icon: Award },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-white/10 text-white shadow-md font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4 text-amber-400" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'custom' && (
          <button
            onClick={handleOpenCreateReward}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-primary text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Recompensa
          </button>
        )}
      </div>

      {/* SHOP ITEMS GRID */}
      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SHOP_ITEMS.map((item) => {
            const unlocked = isUnlocked(item);
            const equipped = isEquipped(item);
            const canAfford = (stats?.coins || 0) >= item.cost;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  equipped
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">
                      {item.type === 'sword' ? '🗡️' : item.type === 'shield' ? '🛡️' : item.type === 'helmet' ? '👑' : '⚡'}
                    </span>
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-300 text-sm">
                      <Coins className="w-4 h-4 text-amber-400" /> {item.cost}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-base text-white">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-white/5">
                  {equipped ? (
                    <div className="w-full py-2 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold text-center border border-amber-500/40">
                      ✓ Equipado Actualmente
                    </div>
                  ) : unlocked ? (
                    <button
                      onClick={() => handleBuy(item)}
                      className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                    >
                      Equipar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-primary text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:brightness-110 disabled:opacity-40 transition-all"
                    >
                      {canAfford ? 'Comprar Ítem' : 'Oro Insuficiente'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CUSTOM REWARDS TAB */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {customRewards.map((cr) => {
              const canAfford = (stats?.coins || 0) >= cr.cost;

              return (
                <div
                  key={cr.id}
                  className="p-5 rounded-3xl border border-white/10 bg-white/[0.03] hover:border-amber-500/40 backdrop-blur-xl transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{cr.icon || '🎁'}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 font-mono font-bold text-amber-300 text-sm bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                          <Coins className="w-4 h-4 text-amber-400" /> {cr.cost}
                        </div>
                        <button
                          onClick={() => handleOpenEditReward(cr)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Editar recompensa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteReward(cr)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar recompensa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-white">{cr.title}</h3>
                      {cr.description && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{cr.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                      <span>Canjeado: {cr.timesClaimed || 0} {cr.timesClaimed === 1 ? 'vez' : 'veces'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    <button
                      onClick={() => setConfirmClaimReward(cr)}
                      disabled={!canAfford}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-primary text-white text-xs font-bold shadow-md shadow-amber-500/20 hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Gift className="w-4 h-4" />
                      <span>{canAfford ? 'Canjear Recompensa' : 'Oro Insuficiente'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {customRewards.length === 0 && (
            <div className="text-center py-16 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 space-y-3">
              <Gift className="w-12 h-12 text-amber-400/40 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes recompensas personalizadas</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Crea premios de la vida real (un episodio de tu serie, comida favorita, descanso especial) para canjearlos con tu oro acumulado.
              </p>
              <button
                onClick={handleOpenCreateReward}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-900 text-xs font-bold shadow-md transition-all"
              >
                + Crear Primera Recompensa
              </button>
            </div>
          )}
        </div>
      )}

      {/* AVATARS & THEMES */}
      {activeTab === 'gear' && (
        <div className="space-y-8">
          {/* Avatars */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Avatares Desbloqueables</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {AVATARS.map(avatar => {
                const isEquipped = cosmetics?.equippedAvatar === avatar;
                return (
                  <div
                    key={avatar}
                    onClick={() => handleEquipAvatar(avatar)}
                    className={`cursor-pointer p-4 rounded-3xl border text-center space-y-2 transition-all ${
                      isEquipped
                        ? 'bg-primary/20 border-primary shadow-lg shadow-primary/30 scale-105'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-md">
                      {avatar[0]}
                    </div>
                    <p className="text-xs font-bold text-white truncate">{avatar}</p>
                    {isEquipped && <span className="text-[10px] text-primary-light font-bold">Activo</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Themes */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Temas Visuales</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(THEMES).map(tName => {
                const themeObj = THEMES[tName];
                const isCurrent = cosmetics?.equippedTheme === tName;
                return (
                  <div
                    key={tName}
                    onClick={() => handleEquipTheme(tName)}
                    className={`cursor-pointer p-4 rounded-3xl border space-y-3 transition-all ${
                      isCurrent
                        ? 'border-primary ring-2 ring-primary/50 shadow-xl'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    style={{ backgroundColor: themeObj.bg }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{tName}</span>
                      {isCurrent && <Check className="w-4 h-4 text-primary-light" />}
                    </div>
                    <div className="h-6 w-full rounded-lg bg-gradient-to-r" style={{ background: themeObj.accent }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-5 rounded-3xl border transition-all flex items-center gap-4 ${
                ach.unlocked
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-white/[0.03] border-white/5 opacity-70'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                ach.unlocked ? 'bg-amber-500 text-dark-900 font-bold shadow-lg shadow-amber-500/40' : 'bg-white/10 text-gray-500'
              }`}>
                {ach.unlocked ? '🏆' : '🔒'}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white truncate">{ach.title}</h3>
                  <span className="text-xs font-mono font-bold text-amber-300">+{ach.xpReward} XP</span>
                </div>
                <p className="text-xs text-gray-400">{ach.description}</p>

                {/* Progress */}
                <div className="pt-1.5 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>Progreso</span>
                    <span>{ach.progress} / {ach.maxProgress}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((ach.progress / ach.maxProgress) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear / Editar Recompensa Personalizada */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                {editingRewardId ? '✏️ Editar Recompensa Personalizada' : '✨ Nueva Recompensa Personalizada'}
              </h3>
              <button onClick={() => setIsRewardModalOpen(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveReward} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Título de la Recompensa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ver 1 capítulo de anime, Comer postre..."
                  value={rewardTitle}
                  onChange={e => setRewardTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">Descripción (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 30 minutos de relax tras terminar tareas..."
                  value={rewardDescription}
                  onChange={e => setRewardDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Costo en Oro (Monedas) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={rewardCost}
                    onChange={e => setRewardCost(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">Ícono Emoji</label>
                  <input
                    type="text"
                    value={rewardIcon}
                    onChange={e => setRewardIcon(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-primary text-xs font-bold text-white shadow-lg shadow-amber-500/20"
                >
                  {editingRewardId ? 'Guardar Cambios' : 'Crear Recompensa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={Boolean(pendingRewardUpdate)}
        title="¿Actualizar recompensa personalizada?"
        description={`¿Deseas guardar las modificaciones para "${pendingRewardUpdate?.payload?.title}"?`}
        confirmLabel="Sí, actualizar"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmRewardUpdate}
        onCancel={() => setPendingRewardUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteReward)}
        title="¿Eliminar recompensa personalizada?"
        description={`¿Estás seguro de que deseas eliminar la recompensa "${confirmDeleteReward?.title}"?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Conservar"
        variant="danger"
        onConfirm={handleConfirmDeleteReward}
        onCancel={() => setConfirmDeleteReward(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmClaimReward)}
        title="¿Canjear esta recompensa?"
        description={`Se descontarán ${confirmClaimReward?.cost} monedas de oro de tu saldo para canjear "${confirmClaimReward?.title}".`}
        confirmLabel="Sí, canjear"
        cancelLabel="Cancelar"
        variant="info"
        onConfirm={handleConfirmClaimReward}
        onCancel={() => setConfirmClaimReward(null)}
      />
    </div>
  );
};

export default ShopView;
