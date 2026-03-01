<template>
  <main class="dashboard">
    <header class="header">
      <div class="header-main">
        <h1>
          <img class="header-logo" src="/logo.svg" alt="Tattoo logo" />
          <span>Tattoo PR Dashboard</span>
        </h1>
        <p><code>NTUT-NPC/tattoo</code> · {{ refreshIntervalSec }}s refresh</p>
      </div>
      <div class="meta" role="status" aria-live="polite">
        <span class="refresh-ring" aria-label="下次更新倒數">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle class="refresh-ring-track" cx="20" cy="20" r="16" />
            <circle
              class="refresh-ring-progress"
              cx="20"
              cy="20"
              r="16"
              :style="{ strokeDashoffset: `${refreshRingDashOffset}px` }"
            />
          </svg>
          <span class="refresh-ring-number">{{ refreshCountdownSec }}</span>
        </span>
        <span :class="['chip', isUpdating ? 'updating' : 'ok']">{{ isUpdating ? '更新中' : '已同步' }}</span>
        <span class="token-state meta-pill" :class="{ active: hasTokenSaved }">
          {{ hasTokenSaved ? 'Token ON' : '匿名' }}
        </span>
        <span class="time meta-pill">{{ lastUpdatedText }}</span>
        <button
          type="button"
          class="settings-btn meta-pill"
          :aria-label="showTokenPanel ? '關閉 Token 設定' : '開啟 Token 設定'"
          @click="showTokenPanel = !showTokenPanel"
        >
          ⚙
        </button>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="grid">
      <div
        v-for="pr in prs"
        :key="pr.id"
        class="card-slot"
        :data-pr-id="pr.id"
        @click="openPrDetails(pr, $event)"
      >
        <PrCard :pr="pr" :activity-display-mode="activityDisplayMode" :date-display-mode="dateDisplayMode" />
      </div>
    </section>

    <Teleport to="body">
      <Transition name="settings-modal">
        <section
          v-if="showTokenPanel"
          class="settings-mask"
          aria-live="polite"
          @click="handleSettingsMaskClick"
        >
          <div class="settings-card" role="dialog" aria-modal="true" aria-label="設定">
            <div class="settings-toolbar">
              <h2>設定</h2>
              <button type="button" class="close-btn" aria-label="關閉設定" @click="showTokenPanel = false">✕</button>
            </div>
            <div class="settings-content">
              <label for="activity-display-mode" class="token-label">動態顯示模式</label>
              <div class="token-controls refresh-controls">
                <select id="activity-display-mode" v-model="activityDisplayMode" @change="applyActivityDisplayMode">
                  <option value="separate">分開顯示最新提交與最新留言（目前）</option>
                  <option value="latest">只顯示提交/留言之中最新的一筆</option>
                </select>
              </div>
              <p class="token-hint">可切換為僅顯示「最新動態（提交或留言）」。</p>

              <label for="date-display-mode" class="token-label">更新時間顯示</label>
              <div class="token-controls refresh-controls">
                <select id="date-display-mode" v-model="dateDisplayMode" @change="applyDateDisplayMode">
                  <option value="smart">智慧時間（分鐘前 / 今天時間 / 幾天前 / 日期）</option>
                  <option value="full">完整時間（目前樣式）</option>
                </select>
              </div>
              <p class="token-hint">預設為智慧時間，可切換回完整日期時間。</p>

              <label for="refresh-interval" class="token-label">更新頻率（秒）</label>
              <div class="token-controls refresh-controls">
                <input
                  id="refresh-interval"
                  v-model.number="refreshIntervalInput"
                  type="number"
                  :min="MIN_REFRESH_INTERVAL_SEC"
                  :max="MAX_REFRESH_INTERVAL_SEC"
                  step="1"
                />
                <button type="button" @click="applyRefreshInterval">套用更新頻率</button>
              </div>
              <p class="token-hint">可設定 {{ MIN_REFRESH_INTERVAL_SEC }} - {{ MAX_REFRESH_INTERVAL_SEC }} 秒。</p>

              <label for="github-token" class="token-label">GitHub API Token（選填）</label>
              <div class="token-controls">
                <input
                  id="github-token"
                  v-model="tokenInput"
                  type="password"
                  placeholder="貼上新 token（不會自動回填已儲存值）"
                  autocomplete="off"
                  spellcheck="false"
                />
                <button type="button" @click="saveToken">儲存 Token</button>
                <button type="button" class="secondary" @click="clearToken">清除</button>
              </div>
              <p class="token-hint">{{ tokenMessage }}</p>
              <p class="token-hint">
                不知道怎麼建立 Token？可參考
                <a href="https://github.com/NTUT-NPC/tattoo-repoDashboard#%E8%A8%AD%E5%AE%9A%E5%80%8B%E4%BA%BA-github-api-token%E5%BB%BA%E8%AD%B0" target="_blank" rel="noreferrer noopener">
                  README 教學
                </a>
                。
              </p>

              <label class="token-label">更新動畫音效</label>
              <div class="token-controls refresh-controls sound-toggle-row">
                <label class="checkbox-label" for="animation-sound-enabled">
                  <input id="animation-sound-enabled" v-model="animationSoundEnabled" type="checkbox" @change="applyAnimationSoundEnabled" />
                  觸發更新動畫時播放音效（預設關閉）
                </label>
              </div>
              <p class="token-hint">可選擇內建音效，或上傳自訂音效檔（mp3 / wav / ogg）。</p>

              <div class="token-controls refresh-controls">
                <select id="animation-sound-mode" v-model="animationSoundMode" @change="applyAnimationSoundMode">
                  <option value="default">使用內建預設音效</option>
                  <option value="custom">使用自訂上傳音效</option>
                </select>
                <button type="button" class="secondary" @click="previewAnimationSound">試聽音效</button>
              </div>

              <div class="token-controls refresh-controls" v-if="animationSoundMode === 'custom'">
                <input
                  id="animation-sound-file"
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg"
                  @change="handleAnimationSoundFileUpload"
                />
                <button type="button" class="secondary" @click="clearCustomAnimationSound">清除上傳音效</button>
              </div>
              <p class="token-hint" v-if="animationSoundMode === 'custom'">
                {{ customAnimationSoundName ? `目前自訂音效：${customAnimationSoundName}` : '尚未上傳自訂音效，會改用內建音效。' }}
              </p>

              <label class="token-label">動畫預覽</label>
              <div class="token-controls">
                <button type="button" class="secondary" @click="previewLatestPrStatusAnimation">預覽最新 PR 狀態更新動畫</button>
              </div>
              <label for="status-animation-close-delay" class="token-label">PR 狀態動畫自動關閉（秒）</label>
              <div class="token-controls refresh-controls">
                <input
                  id="status-animation-close-delay"
                  v-model.number="statusAnimationCloseDelayInputSec"
                  type="number"
                  :min="MIN_STATUS_ANIMATION_CLOSE_DELAY_SEC"
                  :max="MAX_STATUS_ANIMATION_CLOSE_DELAY_SEC"
                  step="1"
                />
                <button type="button" @click="applyStatusAnimationCloseDelay">套用</button>
              </div>
              <p class="token-hint">可設定 {{ MIN_STATUS_ANIMATION_CLOSE_DELAY_SEC }} - {{ MAX_STATUS_ANIMATION_CLOSE_DELAY_SEC }} 秒（預設 {{ DEFAULT_STATUS_ANIMATION_CLOSE_DELAY_SEC }} 秒）。</p>
              <p class="token-hint">使用目前最新 PR 模擬一次狀態更新動畫。</p>
              <p class="token-hint">
                專案 Repo：
                <a href="https://github.com/NTUT-NPC/tattoo-repoDashboard" target="_blank" rel="noreferrer noopener">
                  github.com/NTUT-NPC/tattoo-repoDashboard
                </a>
              </p>
            </div>
          </div>
        </section>
      </Transition>

      <Transition name="detail-modal">
        <section
          v-if="selectedPr"
          class="detail-mask"
          aria-live="polite"
          @click="handleDetailMaskClick"
        >
          <div class="detail-card-wrap">
            <div class="detail-toolbar">
              <button type="button" class="close-btn" aria-label="關閉詳細資訊" @click="closePrDetails">✕</button>
            </div>
            <PrCard
              :pr="selectedPr"
              cinematic
              :effect="detailEffect"
              :ci-summary="detailCiSummary"
              :show-effect="detailShowEffect"
              :date-display-mode="dateDisplayMode"
            />
          </div>
        </section>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PrCard from '../components/PrCard.vue';
import { fetchPrCards, hasSavedGithubToken, saveGithubToken, validateGithubToken, type PullRequestCard } from '../services/githubApi.ts';

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_REFRESH_INTERVAL_SEC = REFRESH_INTERVAL_MS / 1000;
const MIN_REFRESH_INTERVAL_SEC = 5;
const MAX_REFRESH_INTERVAL_SEC = 300;
const REFRESH_INTERVAL_STORAGE_KEY = 'tattoo-dashboard-refresh-interval-sec';
const ACTIVITY_DISPLAY_MODE_STORAGE_KEY = 'tattoo-dashboard-activity-display-mode';
const DATE_DISPLAY_MODE_STORAGE_KEY = 'tattoo-dashboard-date-display-mode';
const DEFAULT_STATUS_ANIMATION_CLOSE_DELAY_SEC = 8;
const MIN_STATUS_ANIMATION_CLOSE_DELAY_SEC = 3;
const MAX_STATUS_ANIMATION_CLOSE_DELAY_SEC = 20;
const STATUS_ANIMATION_CLOSE_DELAY_STORAGE_KEY = 'tattoo-dashboard-pr-status-close-delay-sec';
const ANIMATION_SOUND_ENABLED_STORAGE_KEY = 'tattoo-dashboard-animation-sound-enabled';
const ANIMATION_SOUND_MODE_STORAGE_KEY = 'tattoo-dashboard-animation-sound-mode';
const ANIMATION_SOUND_CUSTOM_DATA_STORAGE_KEY = 'tattoo-dashboard-animation-sound-custom-data';
const ANIMATION_SOUND_CUSTOM_NAME_STORAGE_KEY = 'tattoo-dashboard-animation-sound-custom-name';

type ActivityDisplayMode = 'separate' | 'latest';
type DateDisplayMode = 'smart' | 'full';
type AnimationSoundMode = 'default' | 'custom';

const prs = ref<PullRequestCard[]>([]);
const selectedPr = ref<PullRequestCard | null>(null);
const error = ref('');
const isUpdating = ref(false);
const lastUpdatedAt = ref<Date | null>(null);
const showTokenPanel = ref(false);
const hasTokenSaved = ref(false);
const tokenInput = ref('');
const tokenMessage = ref('目前未設定 token，將使用匿名請求。');
const refreshIntervalSec = ref(DEFAULT_REFRESH_INTERVAL_SEC);
const refreshIntervalInput = ref(DEFAULT_REFRESH_INTERVAL_SEC);
const refreshCountdownSec = ref(DEFAULT_REFRESH_INTERVAL_SEC);
const statusAnimationCloseDelaySec = ref(DEFAULT_STATUS_ANIMATION_CLOSE_DELAY_SEC);
const statusAnimationCloseDelayInputSec = ref(DEFAULT_STATUS_ANIMATION_CLOSE_DELAY_SEC);
const activityDisplayMode = ref<ActivityDisplayMode>('separate');
const dateDisplayMode = ref<DateDisplayMode>('smart');
const detailEffect = ref<'new_pr' | 'ci_complete' | 'merged'>('ci_complete');
const detailCiSummary = ref<Array<{ name: string; result: 'success' | 'failure' }>>([]);
const detailShowEffect = ref(false);
const animationSoundEnabled = ref(false);
const animationSoundMode = ref<AnimationSoundMode>('default');
const customAnimationSoundDataUrl = ref('');
const customAnimationSoundName = ref('');
let timer: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let previewCloseTimer: ReturnType<typeof setTimeout> | null = null;
let nextRefreshAt: number | null = null;

let refreshInFlight: Promise<void> | null = null;
let refreshQueued = false;

const lastUpdatedText = computed(() =>
  lastUpdatedAt.value ? `最後更新：${lastUpdatedAt.value.toLocaleString()}` : '尚未更新',
);
const refreshRingDashOffset = computed(() => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const safeInterval = Math.max(1, refreshIntervalSec.value);
  const progress = Math.min(1, Math.max(0, refreshCountdownSec.value / safeInterval));

  return circumference * (1 - progress);
});

function readRefreshIntervalFromStorage() {
  const raw = window.localStorage.getItem(REFRESH_INTERVAL_STORAGE_KEY);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return DEFAULT_REFRESH_INTERVAL_SEC;
  if (parsed < MIN_REFRESH_INTERVAL_SEC || parsed > MAX_REFRESH_INTERVAL_SEC) {
    return DEFAULT_REFRESH_INTERVAL_SEC;
  }

  return parsed;
}

function readActivityDisplayModeFromStorage(): ActivityDisplayMode {
  const raw = window.localStorage.getItem(ACTIVITY_DISPLAY_MODE_STORAGE_KEY);
  return raw === 'latest' ? 'latest' : 'separate';
}

function readDateDisplayModeFromStorage(): DateDisplayMode {
  const raw = window.localStorage.getItem(DATE_DISPLAY_MODE_STORAGE_KEY);
  return raw === 'full' ? 'full' : 'smart';
}

function readStatusAnimationCloseDelayFromStorage() {
  const raw = window.localStorage.getItem(STATUS_ANIMATION_CLOSE_DELAY_STORAGE_KEY);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return DEFAULT_STATUS_ANIMATION_CLOSE_DELAY_SEC;
  if (parsed < MIN_STATUS_ANIMATION_CLOSE_DELAY_SEC || parsed > MAX_STATUS_ANIMATION_CLOSE_DELAY_SEC) {
    return DEFAULT_STATUS_ANIMATION_CLOSE_DELAY_SEC;
  }

  return parsed;
}

function readAnimationSoundEnabledFromStorage() {
  return window.localStorage.getItem(ANIMATION_SOUND_ENABLED_STORAGE_KEY) === 'true';
}

function readAnimationSoundModeFromStorage(): AnimationSoundMode {
  const raw = window.localStorage.getItem(ANIMATION_SOUND_MODE_STORAGE_KEY);
  return raw === 'custom' ? 'custom' : 'default';
}

function applyActivityDisplayMode() {
  window.localStorage.setItem(ACTIVITY_DISPLAY_MODE_STORAGE_KEY, activityDisplayMode.value);
  tokenMessage.value =
    activityDisplayMode.value === 'latest'
      ? '已切換為僅顯示提交/留言中最新的一筆。'
      : '已切換為分開顯示最新提交與最新留言。';
}

function applyDateDisplayMode() {
  window.localStorage.setItem(DATE_DISPLAY_MODE_STORAGE_KEY, dateDisplayMode.value);
  tokenMessage.value =
    dateDisplayMode.value === 'full'
      ? '已切換為完整日期時間顯示。'
      : '已切換為智慧時間顯示。';
}

function applyAnimationSoundEnabled() {
  window.localStorage.setItem(ANIMATION_SOUND_ENABLED_STORAGE_KEY, String(animationSoundEnabled.value));
  tokenMessage.value = animationSoundEnabled.value
    ? '已開啟更新動畫音效。'
    : '已關閉更新動畫音效。';
}

function applyAnimationSoundMode() {
  window.localStorage.setItem(ANIMATION_SOUND_MODE_STORAGE_KEY, animationSoundMode.value);
  tokenMessage.value = animationSoundMode.value === 'custom'
    ? '已切換為自訂音效模式。'
    : '已切換為內建預設音效。';
}

function playDefaultAnimationSound() {
  const audioContext = new window.AudioContext();
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);

  const oscillator = audioContext.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.23);
  oscillator.connect(gainNode);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.45);

  oscillator.onended = () => {
    void audioContext.close();
  };
}

async function playAnimationSound() {
  if (!animationSoundEnabled.value) return;

  try {
    if (animationSoundMode.value === 'custom' && customAnimationSoundDataUrl.value) {
      const audio = new Audio(customAnimationSoundDataUrl.value);
      audio.volume = 0.8;
      await audio.play();
      return;
    }

    playDefaultAnimationSound();
  } catch (error) {
    console.warn('Failed to play animation sound', error);
    tokenMessage.value = '音效播放失敗，請確認瀏覽器已允許播放音訊。';
  }
}

async function previewAnimationSound() {
  if (!animationSoundEnabled.value) {
    tokenMessage.value = '請先開啟「觸發更新動畫時播放音效」。';
    return;
  }

  await playAnimationSound();
  tokenMessage.value = '已播放目前設定的動畫音效。';
}

function handleAnimationSoundFileUpload(event: Event) {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file) return;

  const isAudioFile = file.type.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.name);
  if (!isAudioFile) {
    tokenMessage.value = '請上傳 mp3 / wav / ogg 音效檔案。';
    if (target) target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : '';
    if (!dataUrl) {
      tokenMessage.value = '音效檔讀取失敗，請再試一次。';
      return;
    }

    customAnimationSoundDataUrl.value = dataUrl;
    customAnimationSoundName.value = file.name;
    window.localStorage.setItem(ANIMATION_SOUND_CUSTOM_DATA_STORAGE_KEY, dataUrl);
    window.localStorage.setItem(ANIMATION_SOUND_CUSTOM_NAME_STORAGE_KEY, file.name);
    tokenMessage.value = `已上傳自訂音效：${file.name}`;
  };
  reader.onerror = () => {
    tokenMessage.value = '音效檔讀取失敗，請再試一次。';
  };
  reader.readAsDataURL(file);
}

function clearCustomAnimationSound() {
  customAnimationSoundDataUrl.value = '';
  customAnimationSoundName.value = '';
  window.localStorage.removeItem(ANIMATION_SOUND_CUSTOM_DATA_STORAGE_KEY);
  window.localStorage.removeItem(ANIMATION_SOUND_CUSTOM_NAME_STORAGE_KEY);
  tokenMessage.value = '已清除自訂音效，將改用內建預設音效。';
}

function scheduleNextRefreshCountdown() {
  nextRefreshAt = Date.now() + refreshIntervalSec.value * 1000;
  refreshCountdownSec.value = refreshIntervalSec.value;
}

function updateRefreshCountdown() {
  if (!nextRefreshAt) {
    refreshCountdownSec.value = refreshIntervalSec.value;
    return;
  }

  const diffSec = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
  refreshCountdownSec.value = diffSec;
}

function restartRefreshTimer() {
  if (timer) clearInterval(timer);

  scheduleNextRefreshCountdown();
  timer = setInterval(async () => {
    await refresh();
    scheduleNextRefreshCountdown();
  }, refreshIntervalSec.value * 1000);
}

async function executeRefreshCycle() {
  isUpdating.value = true;

  try {
    prs.value = await fetchPrCards();
    lastUpdatedAt.value = new Date();
    error.value = '';

    if (selectedPr.value) {
      const latest = prs.value.find((item) => item.id === selectedPr.value?.id) ?? null;
      selectedPr.value = latest;
    }
  } catch (e) {
    console.error(e);
    error.value = '資料更新失敗，先顯示上一版資料。請稍後再試。';
  } finally {
    isUpdating.value = false;
  }
}

async function refresh() {
  if (refreshInFlight) {
    refreshQueued = true;
    return refreshInFlight;
  }

  refreshInFlight = executeRefreshCycle();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
    if (refreshQueued) {
      refreshQueued = false;
      void refresh();
    }
  }
}

function openPrDetails(pr: PullRequestCard, event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('a, button')) return;
  selectedPr.value = pr;
  detailShowEffect.value = false;
}


function closePrDetails() {
  selectedPr.value = null;
  detailShowEffect.value = false;
  if (previewCloseTimer) clearTimeout(previewCloseTimer);
  previewCloseTimer = null;
}

function handleDetailMaskClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('.pr-card.cinematic') || target.closest('.close-btn')) {
    return;
  }

  closePrDetails();
}

function handleSettingsMaskClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  if (target.closest('.settings-card') || target.closest('.settings-btn')) {
    return;
  }

  showTokenPanel.value = false;
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedPr.value) {
    closePrDetails();
  }
}

async function saveToken() {
  const validation = validateGithubToken(tokenInput.value);
  if (!validation.valid) {
    tokenMessage.value = validation.message;
    return;
  }

  saveGithubToken(tokenInput.value);
  tokenInput.value = '';
  hasTokenSaved.value = hasSavedGithubToken();
  tokenMessage.value = '已儲存 token 至 localStorage，後續請求會使用此 token。';
  await refresh();
}

async function clearToken() {
  tokenInput.value = '';
  saveGithubToken('');
  hasTokenSaved.value = false;
  tokenMessage.value = '已清除 token，後續改為匿名請求。';
  await refresh();
}

function buildCiSummary(pr: PullRequestCard): Array<{ name: string; result: 'success' | 'failure' }> {
  if (!pr.ciStates.length) {
    return [{ name: 'CI', result: 'success' }];
  }

  return pr.ciStates.map((item) => {
    const conclusion = (item.conclusion ?? item.status ?? '').toLowerCase();
    const result = conclusion === 'success' ? 'success' : 'failure';
    return { name: item.name, result };
  });
}

function previewLatestPrStatusAnimation() {
  const latestPr = prs.value[0];
  if (!latestPr) {
    tokenMessage.value = '目前沒有可預覽的 PR。';
    return;
  }

  if (previewCloseTimer) clearTimeout(previewCloseTimer);

  showTokenPanel.value = false;
  selectedPr.value = {
    ...latestPr,
    updatedAt: new Date().toISOString(),
  };
  detailEffect.value = 'ci_complete';
  detailCiSummary.value = buildCiSummary(latestPr);
  detailShowEffect.value = true;
  void playAnimationSound();
  tokenMessage.value = `已預覽 PR #${latestPr.number} 狀態更新動畫。`;

  previewCloseTimer = setTimeout(() => {
    closePrDetails();
    previewCloseTimer = null;
  }, statusAnimationCloseDelaySec.value * 1000);
}

function applyStatusAnimationCloseDelay() {
  if (!Number.isInteger(statusAnimationCloseDelayInputSec.value)) {
    tokenMessage.value = 'PR 狀態動畫自動關閉需為整數秒。';
    return;
  }

  if (
    statusAnimationCloseDelayInputSec.value < MIN_STATUS_ANIMATION_CLOSE_DELAY_SEC
    || statusAnimationCloseDelayInputSec.value > MAX_STATUS_ANIMATION_CLOSE_DELAY_SEC
  ) {
    tokenMessage.value = `PR 狀態動畫自動關閉需介於 ${MIN_STATUS_ANIMATION_CLOSE_DELAY_SEC}-${MAX_STATUS_ANIMATION_CLOSE_DELAY_SEC} 秒。`;
    return;
  }

  statusAnimationCloseDelaySec.value = statusAnimationCloseDelayInputSec.value;
  window.localStorage.setItem(STATUS_ANIMATION_CLOSE_DELAY_STORAGE_KEY, String(statusAnimationCloseDelaySec.value));
  tokenMessage.value = `已套用 PR 狀態動畫自動關閉：${statusAnimationCloseDelaySec.value} 秒。`;
}

function applyRefreshInterval() {
  if (!Number.isInteger(refreshIntervalInput.value)) {
    tokenMessage.value = '更新頻率需為整數秒。';
    return;
  }

  if (refreshIntervalInput.value < MIN_REFRESH_INTERVAL_SEC || refreshIntervalInput.value > MAX_REFRESH_INTERVAL_SEC) {
    tokenMessage.value = `更新頻率需介於 ${MIN_REFRESH_INTERVAL_SEC}-${MAX_REFRESH_INTERVAL_SEC} 秒。`;
    return;
  }

  refreshIntervalSec.value = refreshIntervalInput.value;
  window.localStorage.setItem(REFRESH_INTERVAL_STORAGE_KEY, String(refreshIntervalSec.value));
  restartRefreshTimer();
  tokenMessage.value = `已套用更新頻率：每 ${refreshIntervalSec.value} 秒更新一次。`;
}

onMounted(async () => {
  activityDisplayMode.value = readActivityDisplayModeFromStorage();
  dateDisplayMode.value = readDateDisplayModeFromStorage();
  refreshIntervalSec.value = readRefreshIntervalFromStorage();
  refreshIntervalInput.value = refreshIntervalSec.value;
  statusAnimationCloseDelaySec.value = readStatusAnimationCloseDelayFromStorage();
  statusAnimationCloseDelayInputSec.value = statusAnimationCloseDelaySec.value;
  animationSoundEnabled.value = readAnimationSoundEnabledFromStorage();
  animationSoundMode.value = readAnimationSoundModeFromStorage();
  customAnimationSoundDataUrl.value = window.localStorage.getItem(ANIMATION_SOUND_CUSTOM_DATA_STORAGE_KEY) ?? '';
  customAnimationSoundName.value = window.localStorage.getItem(ANIMATION_SOUND_CUSTOM_NAME_STORAGE_KEY) ?? '';

  hasTokenSaved.value = hasSavedGithubToken();
  tokenMessage.value = hasTokenSaved.value
    ? '偵測到已儲存 token（內容隱藏）。'
    : '目前未設定 token，將使用匿名請求。';

  await refresh();
  restartRefreshTimer();
  countdownTimer = setInterval(updateRefreshCountdown, 1000);
  updateRefreshCountdown();
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (countdownTimer) clearInterval(countdownTimer);
  if (previewCloseTimer) clearTimeout(previewCloseTimer);
  window.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; padding: .75rem; }
.header-main { min-width: 0; }
.header { display:flex; justify-content:space-between; gap:1rem; align-items:center; margin-bottom:1rem; }
.header-main h1 { margin:0; color:#f8fafc; font-size: 1.45rem; display: flex; align-items: center; gap: .55rem; }
.header-logo { width: 1.7rem; height: 1.7rem; flex: 0 0 auto; }
.header-main p { margin:.2rem 0 0; color:#94a3b8; font-size: .9rem; }
.refresh-ring {
  width: 2rem;
  height: 2rem;
  display: inline-grid;
  place-items: center;
  position: relative;
  color: #bfdbfe;
  flex: 0 0 auto;
}

.refresh-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.refresh-ring-track,
.refresh-ring-progress {
  fill: none;
  stroke-width: 3;
}

.refresh-ring-track { stroke: #1e293b; }

.refresh-ring-progress {
  stroke: #60a5fa;
  stroke-linecap: round;
  stroke-dasharray: 100.53px;
  transition: stroke-dashoffset .25s linear;
}

.refresh-ring-number {
  position: absolute;
  font-size: .68rem;
  font-weight: 700;
  line-height: 1;
}
code { color:#93c5fd; }
.meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: .45rem;
  padding: .3rem;
  border-radius: 999px;
  border: 1px solid rgba(71, 85, 105, .5);
  background: rgba(15, 23, 42, .55);
}

.meta-pill {
  border-radius: 999px;
  border: 1px solid #334155;
  background: linear-gradient(135deg, rgba(15, 23, 42, .95), rgba(30, 41, 59, .9));
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, .12);
}

.settings-btn {
  width: 31px;
  height: 31px;
  color: #cbd5e1;
  cursor: pointer;
  font-size: .95rem;
  line-height: 1;
  display: inline-grid;
  place-items: center;
  transition: border-color .2s ease, transform .2s ease, color .2s ease;
}

.settings-btn:hover {
  border-color: #60a5fa;
  color: #dbeafe;
  transform: translateY(-1px);
}

.settings-btn:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.token-state { font-size: .72rem; color: #94a3b8; padding: .25rem .52rem; }
.token-state.active { color: #86efac; border-color: rgba(34, 197, 94, .45); }
.chip { font-weight:700; border-radius:999px; padding:.2rem .6rem; font-size:.8rem; }
.chip.ok { background:#052e16; color:#86efac; }
.chip.updating { background:#172554; color:#93c5fd; }
.time { color:#cbd5e1; font-size:.78rem; padding: .25rem .55rem; }
.token-label { display: block; margin-bottom: .45rem; color: #cbd5e1; font-size: .88rem; }
.token-controls { display: flex; gap: .5rem; flex-wrap: wrap; }
.token-controls input { flex: 1; min-width: 240px; background: #020617; border: 1px solid #334155; color: #e2e8f0; border-radius: 8px; padding: .45rem .55rem; }
.token-controls input[type='checkbox'] { min-width: auto; flex: 0 0 auto; accent-color: #60a5fa; }
.token-controls input[type='file'] { padding: .38rem .45rem; }
.token-controls select { flex: 1; min-width: 240px; background: #020617; border: 1px solid #334155; color: #e2e8f0; border-radius: 8px; padding: .45rem .55rem; }
.refresh-controls input { max-width: 190px; min-width: 0; }
.token-controls button { background: #1d4ed8; color: #dbeafe; border: 1px solid #2563eb; border-radius: 8px; padding: .42rem .62rem; font-weight: 600; cursor: pointer; }
.token-controls button.secondary { background: #1e293b; color: #cbd5e1; border-color: #334155; }
.token-hint { margin: .45rem 0 0; font-size: .8rem; color: #cbd5e1; }
.sound-toggle-row { align-items: center; }
.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
  color: #dbeafe;
  font-size: .88rem;
}
.error { border:1px solid #dc2626; color:#fecaca; background:#3f1119; border-radius:10px; padding:.6rem .8rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:.65rem; }
.card-slot { min-width: 0; cursor: zoom-in; }

.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(3px);
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.settings-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.76);
  backdrop-filter: blur(4px);
  z-index: 75;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.settings-card {
  width: min(96vw, 1100px);
  min-height: min(86vh, 860px);
  max-height: 94vh;
  border: 1px solid #2b3f72;
  border-radius: 14px;
  background: #111a33;
  box-shadow: 0 22px 60px rgba(2, 6, 23, .62);
  display: grid;
  grid-template-rows: auto 1fr;
}

.settings-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .8rem;
  padding: .85rem .95rem;
  border-bottom: 1px solid rgba(59, 130, 246, .18);
}

.settings-toolbar h2 {
  margin: 0;
  color: #dbeafe;
  font-size: 1.02rem;
}

.settings-content {
  padding: .9rem .95rem 1.1rem;
  overflow-y: auto;
  min-height: 0;
}

.settings-modal-enter-active,
.settings-modal-leave-active {
  transition: background-color .24s ease, backdrop-filter .24s ease;
}

.settings-modal-enter-from,
.settings-modal-leave-to {
  background: rgba(2, 6, 23, 0);
  backdrop-filter: blur(0);
}

.settings-modal-enter-active .settings-card,
.settings-modal-leave-active .settings-card {
  transition: transform .24s ease, opacity .24s ease;
}

.settings-modal-enter-from .settings-card,
.settings-modal-leave-to .settings-card {
  transform: translateY(18px) scale(.985);
  opacity: 0;
}

.detail-card-wrap {
  width: min(95vw, 1120px);
  max-height: 92vh;
  position: relative;
  display: grid;
  gap: .45rem;
  transform-origin: center;
  z-index: 1;
}

.detail-toolbar {
  display: flex;
  justify-content: flex-end;
}

.detail-modal-enter-active,
.detail-modal-leave-active {
  transition: background-color .34s ease, backdrop-filter .34s ease;
}

.detail-modal-enter-from,
.detail-modal-leave-to {
  background: rgba(2, 6, 23, 0);
  backdrop-filter: blur(0);
}

.detail-modal-enter-active .detail-card-wrap,
.detail-modal-leave-active .detail-card-wrap {
  transition: transform .46s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.detail-modal-enter-from .detail-card-wrap {
  transform: translateY(-110vh);
}

.detail-modal-leave-to .detail-card-wrap {
  transform: translateY(110vh);
}

.showcase-card.enter {
  animation: card-drop-in .9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.showcase-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 2;
}

.close-btn {
  z-index: 1;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid #475569;
  background: rgba(15, 23, 42, .92);
  color: #e2e8f0;
  cursor: pointer;
}

@media (max-width: 950px) and (orientation: landscape) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .detail-card-wrap { width: min(96vw, 1120px); }
}

@media (max-width: 640px) {
  .dashboard { padding: .55rem; }
  .header { flex-direction:column; align-items:stretch; gap: .45rem; margin-bottom: .7rem; }
  .header-main h1 { font-size: 1.08rem; line-height: 1.2; }
  .header-logo { width: 1.35rem; height: 1.35rem; }
  .header-main p { display: none; }
  .meta { justify-content:flex-start; gap: .3rem; }
  .meta .time,
  .meta .token-state { display: none; }
  .refresh-ring { width: 1.7rem; height: 1.7rem; }
  .chip { font-size: .72rem; padding: .16rem .42rem; }
  .settings-btn { width: 28px; height: 28px; }
  .settings-card {
    width: 100%;
    min-height: calc(100vh - 1.1rem);
    max-height: calc(100vh - 1.1rem);
    border-radius: 12px;
  }
}
</style>
