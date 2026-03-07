// 人生玩家 - 里程碑 1/2/3/4/5/6 后端（Node.js + Express）
// 里程碑 6：作息打卡（schedule_logs + 属性奖励）、支线任务（type='支线'）

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ======== 简易内存数据（里程碑 1/2 可用，后续用数据库替换）========

// 用户列表：真实项目中使用 users 表
const users = [];

// 验证码存储：phone -> { code, expiresAt }
const phoneCodes = new Map();

// 人生水晶 / Boss / 挑战 / 技能（里程碑 2）
let nextVisionId = 1;
let nextBossId = 1;
let nextChallengeId = 1;
let nextSkillId = 1;

const visions = []; // { id, userId, content, createdAt }
const bosses = []; // { id, userId, visionId, title, description, status, createdAt }
const challenges = []; // { id, userId, bossId, title, coreSkills, skillLevelRequirements, createdAt }
const skills = []; // { id, userId, name, primaryAttribute, secondaryAttribute, level, xp, createdAt }

// 任务与成就（里程碑 3）
let nextTaskId = 1;
let nextAchievementId = 1;
let nextUserAchievementId = 1;

// 任务：id, userId, title, type(daily|weekly|one_time), status(pending|completed|deleted),
//       xpReward, coinsReward, apValue, attributeEffects{wood,fire,earth,metal,water}, skillXp[{skillId,xp}],
//       createdAt, completedAt
const tasks = [];
// 成就：id, code, name, description
const achievements = [
  { id: 1, code: 'first_task', name: '初试身手', description: '完成第一个任务' },
  { id: 2, code: 'task_5', name: '小有成效', description: '累计完成 5 个任务' },
  { id: 3, code: 'task_10', name: '持之以恒', description: '累计完成 10 个任务' },
  { id: 4, code: 'skill_up', name: '技能精进', description: '任意技能升级' },
];
const userAchievements = []; // { id, userId, achievementId, unlockedAt }

// 里程碑 5：补给包定义与用户库存
let nextSupplyPackId = 1;
let nextUserSupplyId = 1;
// ownerUserId: null 表示系统预设，非空表示用户自定义补给包
// scenario: 可选，表示使用场景标签，如 'deep_work'、'exercise' 等
const supplyPacks = [
  { id: 1, ownerUserId: null, scenario: 'deep_work', name: '精力饮料', description: '恢复专注与精力', effects: { fire: 15 }, cooldownMinutes: 30, sideEffects: { water: -3 }, icon: '🥤' },
  { id: 2, ownerUserId: null, scenario: 'relax',     name: '静心茶',   description: '平复心情',     effects: { water: 12 }, cooldownMinutes: 20, sideEffects: {},             icon: '🍵' },
  { id: 3, ownerUserId: null, scenario: 'balance',   name: '均衡丸',   description: '小幅平衡五行', effects: { wood: 5, fire: 5, earth: 5, metal: 5, water: 5 }, cooldownMinutes: 60, sideEffects: {}, icon: '💊' },
];
const userSupplies = []; // { id, userId, supplyPackId, quantity, lastUsedAt }

// 里程碑 6：作息打卡记录
let nextScheduleLogId = 1;
const scheduleLogs = []; // { id, userId, type: 'sleep'|'wake'|'r90_start'|'r90_wake', at: ISO string, createdAt, meta? }

// 里程碑 7：财务与奖励兑换闭环（内存）
let nextTransactionId = 1;
let nextWealthGoalId = 1;
let nextBudgetId = 1;
let nextRewardItemId = 1;
let nextRewardRedemptionId = 1;

const transactions = []; // { id,userId,type(income|expense),amount,category,note,at,createdAt,meta }
const wealthGoals = []; // { id,userId,title,targetAmount,createdAt }
const budgets = []; // { id,userId,month,rewardLimitRmb,rewardSpentRmb,createdAt }
const rewardItems = [
  { id: 1, name: '奶茶一杯', coinCost: 80, rmbValue: 18, description: '快乐补给', icon: '🧋' },
  { id: 2, name: '电影票', coinCost: 220, rmbValue: 45, description: '放松一下', icon: '🎬' },
  { id: 3, name: '一本书', coinCost: 260, rmbValue: 59, description: '知识投资', icon: '📚' },
];
const rewardRedemptions = []; // { id,userId,source:'item'|'wish',rewardItemId?,wishId?,name?,coinCost,rmbValue,month,createdAt }
let nextUserWishRewardId = 1;
const userWishRewards = []; // { id,userId,name,description,category,targetCoins,estimatedRmb,imageUrl,linkedBossId,status,currentCoins,priority,isPublic,createdAt }

// 里程碑 10：站内通知中心（简版队列）
let nextNotificationId = 1;
// { id,userId,type,title,content,actionLink,createdAt,read }
const notifications = [];

function pushNotification(userId, type, title, content, actionLink) {
  if (!userId) return;
  const n = {
    id: nextNotificationId++,
    userId,
    type,
    title,
    content,
    actionLink: actionLink || null,
    createdAt: new Date().toISOString(),
    read: false,
  };
  notifications.push(n);
  // 简单上限，防止内存无限增长
  if (notifications.length > 5000) {
    notifications.splice(0, notifications.length - 5000);
  }
  return n;
}

// 里程碑 11：社交网络与协作（内存模型）
let nextFriendshipId = 1;
// 简化为双向好友关系：一条记录表示互为好友
// { id,userId,friendUserId,createdAt }
const friendships = [];

let nextGuildId = 1;
let nextGuildMemberId = 1;
// 公会：目标与等级
// { id,name,ownerUserId,goalText,level,xp,createdAt }
const guilds = [];
// 成员：{ id,guildId,userId,role:'leader'|'member',joinedAt }
const guildMembers = [];

// 互动道具（社交向），通过金币或任务获得
const socialItems = [
  {
    code: 'energy_bottle',
    name: '精力瓶',
    description: '为好友恢复 5 点精力（火）',
    effects: { fire: 5 },
  },
  {
    code: 'shield_talisman',
    name: '护盾符',
    description: '帮好友抵消一次 Boss 反击（当前仅作为提示）',
    effects: {},
  },
];

// 排行榜隐私偏好：{ userId, hideRanking }
const leaderboardPrefs = [];

function getOrCreateLeaderboardPref(userId) {
  let pref = leaderboardPrefs.find((p) => p.userId === userId);
  if (!pref) {
    pref = { userId, hideRanking: false };
    leaderboardPrefs.push(pref);
  }
  return pref;
}

function areFriends(userId, friendUserId) {
  return friendships.some(
    (f) =>
      (f.userId === userId && f.friendUserId === friendUserId) ||
      (f.userId === friendUserId && f.friendUserId === userId),
  );
}

function getUserPublicProfile(u) {
  if (!u) return null;
  const attrs = u.attributes || {};
  const entries = Object.entries(attrs);
  let dominant = null;
  if (entries.length) {
    dominant = entries.reduce(
      (best, [key, value]) => {
        const v = typeof value === 'number' ? value : 60;
        if (!best || v > best.value) return { key, value: v };
        return best;
      },
      null,
    );
  }
  const boss = bosses.find((b) => b.userId === u.id) || null;
  return {
    id: u.id,
    username: u.username,
    avatar_url: u.avatar_url,
    dominantElement: dominant ? { key: dominant.key, value: dominant.value } : null,
    mainBossTitle: boss ? boss.title : null,
  };
}

function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// 里程碑 8：娱乐记录与复盘（内存）
let nextEntertainmentLogId = 1;
let nextRetrospectId = 1;
let nextRetrospectTemplateId = 1;
const entertainmentLogs = []; // { id,userId,activity,duration,at,createdAt }
// 模板化复盘：templates + retrospects(answers JSON)
// template.userId === null 表示系统模板
const retrospectTemplates = [
  {
    id: 1,
    userId: null,
    title: '经典三问',
    description: '适用于任意任务完成后的快速反思。',
    questions: [
      { type: 'text', question: '做得好的地方？' },
      { type: 'text', question: '遇到的困难？' },
      { type: 'text', question: '下次如何改进？' },
    ],
    category: '通用',
    isPublic: true,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: null,
    title: '项目复盘 5 步法',
    description: '适用于完成一项具体工作/项目后更深入复盘。',
    questions: [
      { type: 'text', question: '目标是什么？是否达成？' },
      { type: 'text', question: '做得好的地方（可复用的做法）？' },
      { type: 'text', question: '卡点/风险/错误在哪里？' },
      { type: 'text', question: '下次具体改进动作（可执行）？' },
      { type: 'rating', question: '整体满意度', max: 5 },
    ],
    category: '工作/学习',
    isPublic: true,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  },
];
nextRetrospectTemplateId = 3;

const retrospects = []; // { id,userId, type, title, templateId, answers:[{questionId,answer}], createdAt }

// 复盘 v2：混合内容（问题块 + 自由文本块）或纯文本
const retrospectsV2 = []; // { id,userId,title,contentType,freeContent,qaData,linkedTaskId,linkedChallengeId,moodRating,tags,createdAt,updatedAt }

// 战略沙盘：战略节点 + 节点技能
let nextStrategicNodeId = 1;
const strategicNodes = []; 
// { id,userId,parentId,type:'goal'|'campaign'|'task',title,description,positionX,positionY,attributes,status,createdAt,updatedAt }
const nodeSkills = []; 
// { nodeId, skillId, requiredLevel }

// 里程碑 9：励志墙与时光胶囊（内存）
let nextMotivationPostId = 1;
let nextMotivationCommentId = 1;
let nextTimeCapsuleId = 1;
const motivationPosts = []; // { id,userId,text,category,linkedBossId,linkedChallengeId,tags,likesCount,commentsCount,bookmarksCount,createdAt }
const motivationLikes = []; // { userId, postId }
const motivationBookmarks = []; // { userId, postId }
const motivationComments = []; // { id,postId,userId,text,createdAt }
const timeCapsules = []; // { id,userId,title,message,openAt,createdAt,openedAt }

// 世界动态事件流：用于记录 Boss 反击 / 免战牌 / 战略重组等叙事事件
let nextWorldEventId = 1;
const worldEvents = []; // { id,userId,type,title,message,meta,createdAt }

function logWorldEvent(userId, type, title, message, meta) {
  if (!userId) return;
  const event = {
    id: nextWorldEventId++,
    userId,
    type,
    title,
    message,
    meta: meta || null,
    createdAt: new Date().toISOString(),
  };
  worldEvents.push(event);
  // 控制内存大小
  if (worldEvents.length > 5000) {
    worldEvents.splice(0, worldEvents.length - 5000);
  }
  return event;
}

// 里程碑 13：新用户引导问卷与学习资源库（内存）
const onboardingQuestions = [
  {
    id: 1,
    key: 'priority_focus',
    text: '接下来 3 个月，你最想优先提升哪一块能力？',
    options: [
      { value: 'creativity', label: '创造力 / 表达（水倾向）', effects: { water: 5 }, tags: ['creativity'] },
      { value: 'logic', label: '逻辑思维 / 分析（土倾向）', effects: { earth: 5 }, tags: ['logic'] },
      { value: 'health', label: '身体健康 / 体能（木倾向）', effects: { wood: 5 }, tags: ['health'] },
    ],
  },
  {
    id: 2,
    key: 'work_style',
    text: '你更习惯怎样的工作/学习节奏？',
    options: [
      { value: 'deep_work', label: '少但长时间的深度专注（火倾向）', effects: { fire: 3 }, tags: ['deep_work'] },
      { value: 'fragment', label: '碎片化、随时随地安排（风格均衡）', effects: { water: 2, earth: 2 }, tags: ['fragment'] },
    ],
  },
  {
    id: 3,
    key: 'life_focus',
    text: '当下你最希望改善生活中的哪一块？',
    options: [
      { value: 'career', label: '事业 / 学业进步（金倾向）', effects: { metal: 4 }, tags: ['career'] },
      { value: 'emotion', label: '情绪稳定 / 压力管理（水倾向）', effects: { water: 4 }, tags: ['emotion'] },
    ],
  },
  {
    id: 4,
    key: 'learn_style',
    text: '你更喜欢哪种学习方式？',
    options: [
      { value: 'reading', label: '阅读 / 系统课程（土倾向）', effects: { earth: 3 }, tags: ['reading'] },
      { value: 'practice', label: '做中学 / 小项目（火倾向）', effects: { fire: 3 }, tags: ['practice'] },
    ],
  },
  {
    id: 5,
    key: 'social_pref',
    text: '在成长过程中，你更希望怎样的社交氛围？',
    options: [
      { value: 'solo', label: '安静独行，偶尔分享成果', effects: { water: 2 }, tags: ['solo'] },
      { value: 'team', label: '与同伴同行，互相鼓励', effects: { wood: 2 }, tags: ['team'] },
    ],
  },
];

// 简易学习资源库：与技能/标签关联，用于推荐
const learningResources = [
  {
    id: 1,
    title: '战胜拖延：GTD + 番茄 5 步实践',
    url: 'https://example.com/anti-procrastination',
    coreSkills: ['时间管理', '任务分解'],
    tags: ['拖延', '效率', 'anti_procrastination'],
  },
  {
    id: 2,
    title: '从 0 到 1 的数据分析入门',
    url: 'https://example.com/data-analysis',
    coreSkills: ['数据分析', 'Excel', 'Python'],
    tags: ['逻辑思维', '分析'],
  },
  {
    id: 3,
    title: '30 天创意写作挑战',
    url: 'https://example.com/creative-writing',
    coreSkills: ['写作', '表达'],
    tags: ['创造力', '写作'],
  },
  {
    id: 4,
    title: 'R90 睡眠法：图解指南',
    url: 'https://example.com/r90-sleep',
    coreSkills: ['睡眠管理'],
    tags: ['健康', '睡眠'],
  },
];

// 主页聚合：构建简要摘要与提醒
function buildHomeExtras(user) {
  const now = new Date();

  // 作息摘要（复用 scheduleLogs）
  const userLogs = scheduleLogs
    .filter((l) => l.userId === user.id)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const lastSleep = userLogs.find((l) => l.type === 'sleep');
  const lastWake = userLogs.find((l) => l.type === 'wake');
  let lastNightDurationHours = null;
  if (lastSleep && lastWake && new Date(lastWake.at) > new Date(lastSleep.at)) {
    lastNightDurationHours = (new Date(lastWake.at) - new Date(lastSleep.at)) / (1000 * 60 * 60);
  }

  const scheduleBrief = {
    lastSleep: lastSleep ? lastSleep.at : null,
    lastWake: lastWake ? lastWake.at : null,
    lastNightDurationHours: lastNightDurationHours != null ? Math.round(lastNightDurationHours * 10) / 10 : null,
  };

  // 娱乐摘要：最近 7 天
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const entRecent = entertainmentLogs.filter(
    (l) => l.userId === user.id && new Date(l.at) >= sevenDaysAgo
  );
  const entertainmentSummary = {
    count: entRecent.length,
    totalMinutes: entRecent.reduce((s, l) => s + (Number(l.duration || 0) || 0), 0),
    lastActivity: entRecent.length ? entRecent[0].activity : null,
  };

  // 财务摘要：调用与 finance/overview 相同的数据源
  const month = monthKey();
  let goal = wealthGoals.find((g) => g.userId === user.id) || null;
  let budget = budgets.find((b) => b.userId === user.id && b.month === month) || null;
  if (!budget) {
    budget = {
      id: nextBudgetId++,
      userId: user.id,
      month,
      rewardLimitRmb: 200,
      rewardSpentRmb: 0,
      createdAt: new Date().toISOString(),
    };
    budgets.push(budget);
  }
  const remainingReward = Number(budget.rewardLimitRmb || 0) - Number(budget.rewardSpentRmb || 0);
  const financeSummary = {
    month,
    cashBalance: user.cash_balance || 0,
    rewardLimitRmb: Number(budget.rewardLimitRmb || 0),
    rewardRemainingRmb: remainingReward,
    wealthGoalTitle: goal ? goal.title : null,
  };

  // 励志摘要：最近 3 条自己的帖子
  const myPosts = motivationPosts
    .filter((p) => p.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)
    .map((p) => ({ id: p.id, text: p.text, createdAt: p.createdAt }));
  const motivationPreview = {
    count: myPosts.length,
    latest: myPosts[0] || null,
    items: myPosts,
  };

  // 简单提醒规则
  const reminders = [];
  if (scheduleBrief.lastNightDurationHours != null && scheduleBrief.lastNightDurationHours < 7) {
    reminders.push({
      type: 'sleep',
      title: '最近睡眠有点少',
      message: `上次睡眠约 ${scheduleBrief.lastNightDurationHours} 小时，建议今晚尝试 5 个 R90 周期。`,
    });
  }
  if (entertainmentSummary.count === 0) {
    reminders.push({
      type: 'entertainment',
      title: '给自己一点放松',
      message: '最近 7 天还没有娱乐记录，可以安排一次小小的放松，心情会更稳。',
    });
  }
  if (financeSummary.rewardRemainingRmb < 20) {
    reminders.push({
      type: 'finance',
      title: '本月自我奖励预算将用尽',
      message: `本月自我奖励预算剩余约 ¥${Math.max(0, Math.round(financeSummary.rewardRemainingRmb))}，可以在财务页调整预算或规划心愿。`,
    });
  }
  if (motivationPreview.count === 0) {
    reminders.push({
      type: 'motivation',
      title: '写一句话给现在的自己',
      message: '去励志墙发布第一条留言，让未来的自己看到今天的你在努力。',
    });
  }

  return {
    scheduleBrief,
    entertainmentSummary,
    financeSummary,
    motivationPreview,
    reminders,
  };
}

// 五行生克：生（木→火→土→金→水→木）、克（木克土、土克水、水克火、火克金、金克木）
const ELEMENT_GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const ELEMENT_LABELS = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const ELEMENT_LABELS_CN = { wood: '健康', fire: '精力', earth: '智慧', metal: '财富', water: '心情' };

function applyElementInteractions(userAttrs, directDeltas) {
  const extra = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const messages = [];
  for (const [elem, delta] of Object.entries(directDeltas)) {
    if (delta <= 0) continue;
    const generated = ELEMENT_GENERATES[elem];
    if (generated) {
      const bonus = 1;
      extra[generated] = (extra[generated] || 0) + bonus;
      messages.push(`${ELEMENT_LABELS[elem]}生${ELEMENT_LABELS[generated]}，额外${ELEMENT_LABELS_CN[generated]}+${bonus}`);
    }
  }
  for (const key of ['wood', 'fire', 'earth', 'metal', 'water']) {
    const add = extra[key] || 0;
    if (add === 0) continue;
    const before = userAttrs[key] != null ? userAttrs[key] : 60;
    userAttrs[key] = clampAttr(before + add);
  }
  return messages;
}

function clampAttr(v) {
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

// 里程碑 12：防流失机制 —— Boss 进度被拖延怪侵蚀
function applyBossInactivityDecay(user) {
  const now = Date.now();
  const lastLoginIso = user.last_login_at;
  if (!lastLoginIso) {
    user.last_login_at = new Date().toISOString();
    return null;
  }
  const shieldUntil = user.shield_until ? new Date(user.shield_until).getTime() : null;
  if (shieldUntil && shieldUntil > now) {
    return { skippedByShield: true };
  }
  const lastLogin = new Date(lastLoginIso).getTime();
  const lastDecayAt = user.last_boss_decay_at ? new Date(user.last_boss_decay_at).getTime() : lastLogin;
  const INACTIVITY_GRACE_MS = 2 * 24 * 60 * 60 * 1000; // 前 2 天不衰减
  const sinceLastDecay = now - lastDecayAt;
  if (sinceLastDecay <= INACTIVITY_GRACE_MS) return null;
  const days = Math.floor(sinceLastDecay / (24 * 60 * 60 * 1000));
  if (days <= 0) return null;

  const myBosses = bosses.filter((b) => b.userId === user.id && b.status === '进行中');
  if (!myBosses.length) {
    user.last_boss_decay_at = new Date().toISOString();
    return null;
  }

  let totalLoss = 0;
  myBosses.forEach((b) => {
    if (typeof b.controlPercent !== 'number') b.controlPercent = 100;
    const before = b.controlPercent;
    const loss = Math.min(30, days * 2); // 每天最多 2%，单次调用最多 30%
    b.controlPercent = Math.max(0, clampAttr(before - loss));
    totalLoss += before - b.controlPercent;
  });

  user.last_boss_decay_at = new Date().toISOString();

  if (totalLoss > 0) {
    const msg = `最近有一段时间未登录，拖延怪正在侵蚀你的战场：当前进行中的 Boss 领地共被夺走约 ${Math.round(
      totalLoss,
    )}%。`;
    pushNotification(
      user.id,
      'boss_decay',
      '拖延怪夺回了一些领地',
      msg,
      '/home',
    );
    logWorldEvent(
      user.id,
      'boss_decay',
      '拖延怪发动了反击',
      msg,
      { days, totalLoss },
    );
    return { days, totalLoss, message: msg };
  }
  return null;
}

// 简单的“令牌”实现（里程碑 1：不做真正 JWT）
function createToken(userId) {
  return `mock-token-${userId}`;
}

function getUserFromToken(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  const token = parts[1];
  const prefix = 'mock-token-';
  if (!token.startsWith(prefix)) return null;
  const userId = token.slice(prefix.length);
  return users.find((u) => String(u.id) === userId) || null;
}

// ======== Auth 接口：手机号验证码登录 + 微信/QQ 占位 ========

// 中国大陆手机号：1 开头，共 11 位数字
const PHONE_REG = /^1\d{10}$/;
function isValidPhone(phone) {
  return typeof phone === 'string' && PHONE_REG.test(phone.trim());
}

// 发送验证码（需正式手机号格式，后续可接第三方短信）
app.post('/api/auth/send-code', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ success: false, error: '请输入手机号' });
  }
  const trimmed = String(phone).trim();
  if (!isValidPhone(trimmed)) {
    return res.status(400).json({ success: false, error: '请输入正确的 11 位手机号（1 开头）' });
  }

  const code = '123456'; // 开发期固定验证码，正式环境需接入短信服务
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分钟有效
  phoneCodes.set(trimmed, { code, expiresAt });

  return res.json({ success: true });
});

// 验证验证码并登录/注册
app.post('/api/auth/login', (req, res) => {
  const { phone, code, nickname, avatarUrl } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ success: false, error: '请输入手机号和验证码' });
  }
  const trimmed = String(phone).trim();
  if (!isValidPhone(trimmed)) {
    return res.status(400).json({ success: false, error: '请输入正确的 11 位手机号' });
  }

  const record = phoneCodes.get(trimmed);
  if (!record || record.code !== code || record.expiresAt < Date.now()) {
    return res.status(400).json({ success: false, error: '验证码错误或已过期' });
  }

  phoneCodes.delete(trimmed);

  let user = users.find((u) => u.phone === trimmed);
  if (!user) {
    const nowIso = new Date().toISOString();
    user = {
      id: users.length + 1,
      phone: trimmed,
      username: nickname || `玩家${users.length + 1}`,
      avatar_url: avatarUrl || null,
      coins: 0,
      total_xp: 0,
      level: 1,
      // 余额与五行属性在里程碑 1 可以先用占位值
      cash_balance: 0,
      attributes: {
        wood: 60,
        fire: 60,
        earth: 60,
        metal: 60,
        water: 60,
      },
      last_tick_at: Date.now(),
      last_login_at: nowIso,
      last_boss_decay_at: null,
      shield_until: null,
      created_at: nowIso,
    };
    users.push(user);
  } else {
    user.last_login_at = new Date().toISOString();
  }
  if (!user.last_tick_at) user.last_tick_at = Date.now();

  const token = createToken(user.id);
  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      username: user.username,
      avatar_url: user.avatar_url,
    },
  });
});

// 微信登录（占位：正式接入需配置微信开放平台 AppId 与回调）
app.post('/api/auth/wechat', (req, res) => {
  return res.status(501).json({
    success: false,
    error: '微信登录即将上线，请先使用手机号登录',
  });
});

// QQ 登录（占位：正式接入需配置 QQ 互联 AppId 与回调）
app.post('/api/auth/qq', (req, res) => {
  return res.status(501).json({
    success: false,
    error: 'QQ 登录即将上线，请先使用手机号登录',
  });
});

// 微信小程序「游客登录」测试入口：不做真实解密，只创建/返回一个测试用户
app.post('/api/auth/wx-login-test', (req, res) => {
  // 随便拿一个现有用户；如果没有就创建一个测试用户
  let user = users[0];
  if (!user) {
    const nowIso = new Date().toISOString();
    user = {
      id: users.length + 1,
      phone: null,
      username: '测试玩家',
      avatar_url: null,
      coins: 0,
      total_xp: 0,
      level: 1,
      cash_balance: 0,
      attributes: {
        wood: 60,
        fire: 60,
        earth: 60,
        metal: 60,
        water: 60,
      },
      last_tick_at: Date.now(),
      last_login_at: nowIso,
      last_boss_decay_at: null,
      shield_until: null,
      created_at: nowIso,
    };
    users.push(user);
  } else {
    user.last_login_at = new Date().toISOString();
  }
  if (!user.last_tick_at) user.last_tick_at = Date.now();

  const token = createToken(user.id);
  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
    },
  });
});

// ======== 主页数据 API（游戏大厅）========

app.get('/api/home', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }

  const decayInfo = applyBossInactivityDecay(user) || null;

  // 等级经验条：简单分段规则（里程碑 1 可写死）
  const currentLevelXp = user.total_xp;
  const nextLevelXp = user.level * 100;
  const expPercent = Math.min(
    100,
    Math.floor((currentLevelXp / nextLevelXp) * 100) || 0
  );

  let userTasks = tasks.filter((t) => t.userId === user.id && t.status !== 'deleted');
  // 新用户无任务时种子默认日常任务（里程碑 3）
  if (userTasks.length === 0) {
    const defaults = [
      { title: '每日刷题 2 道', type: 'daily', xpReward: 15, coinsReward: 5, apValue: 2, attributeEffects: { fire: -5, earth: 3 }, skillXp: [] },
      { title: '健身 30 分钟', type: 'daily', xpReward: 20, coinsReward: 8, apValue: 3, attributeEffects: { wood: 5, fire: -8, water: 5 }, skillXp: [] },
      { title: '阅读 30 分钟', type: 'daily', xpReward: 15, coinsReward: 5, apValue: 2, attributeEffects: { earth: 4, water: 2 }, skillXp: [] },
    ];
    for (const d of defaults) {
      const t = {
        id: nextTaskId++,
        userId: user.id,
        title: d.title,
        type: d.type,
        status: 'pending',
        xpReward: d.xpReward,
        coinsReward: d.coinsReward,
        apValue: d.apValue,
        attributeEffects: d.attributeEffects || {},
        skillXp: d.skillXp || [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      tasks.push(t);
    }
    userTasks = tasks.filter((t) => t.userId === user.id && t.status !== 'deleted');
  }
  if (userSupplies.filter((us) => us.userId === user.id).length === 0) {
    supplyPacks.forEach((p) => {
      userSupplies.push({
        id: nextUserSupplyId++,
        userId: user.id,
        supplyPackId: p.id,
        quantity: 2,
        lastUsedAt: null,
      });
    });
  }

  // 里程碑 5：属性衰减与恢复（每小时 tick：精力-2，心情+1）
  const TICK_INTERVAL_MS = 60 * 60 * 1000;
  const now = Date.now();
  if (now - (user.last_tick_at || now) >= TICK_INTERVAL_MS) {
    const ticks = Math.floor((now - user.last_tick_at) / TICK_INTERVAL_MS);
    user.last_tick_at = now;
    const attrs = user.attributes;
    for (let i = 0; i < ticks; i++) {
      attrs.fire = clampAttr((attrs.fire != null ? attrs.fire : 60) - 2);
      attrs.water = clampAttr((attrs.water != null ? attrs.water : 60) + 1);
    }
  }

  const mainBoss = bosses.find((b) => b.userId === user.id) || null;
  const userChallenges = challenges.filter((c) => c.userId === user.id);
  const userSkills = skills.filter((s) => s.userId === user.id);
  const challengesUnderCurrentBoss =
    mainBoss ? userChallenges.filter((c) => c.bossId === mainBoss.id) : [];

  const mySupplies = userSupplies.filter((us) => us.userId === user.id).map((us) => {
    const pack = supplyPacks.find((p) => p.id === us.supplyPackId);
    return { ...us, pack: pack || {} };
  });

  const myStrategicTasks = strategicNodes
    .filter((n) => n.userId === user.id && n.type === 'task' && n.attributes && n.attributes.linkedTaskId)
    .map((n) => ({
      id: n.id,
      title: n.title,
      status: n.status || 'planning',
      linkedTaskId: n.attributes.linkedTaskId,
      parentId: n.parentId || null,
    }))
    .slice(0, 5);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      level: user.level,
      total_xp: user.total_xp,
      cash_balance: user.cash_balance,
    },
    experience: {
      current: currentLevelXp,
      nextLevel: nextLevelXp,
      percent: expPercent,
    },
    attributes: user.attributes,
    mainBoss,
    challenges: userChallenges,
    skills: userSkills,
    // 里程碑 4：当前 Boss 下的挑战列表，便于主页展示「在打什么仗」
    currentBoss: mainBoss,
    challengesUnderCurrentBoss,
    dailyTasks: userTasks,
    rewardsSummary: { coins: user.coins, badges: [] },
    userSupplies: mySupplies,
    strategicTasks: myStrategicTasks,
    homeExtras: buildHomeExtras(user),
    worldState: { bossDecay: decayInfo },
  });
});

// 里程碑 4：主页数据 API v2（与 /api/home 结构一致，明确当前 Boss + 其下挑战）
app.get('/api/home/v2', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }
  const currentBoss = bosses.find((b) => b.userId === user.id) || null;
  const userChallenges = challenges.filter((c) => c.userId === user.id);
  const userSkills = skills.filter((s) => s.userId === user.id);
  const challengesUnderCurrentBoss =
    currentBoss ? userChallenges.filter((c) => c.bossId === currentBoss.id) : [];

  const currentLevelXp = user.total_xp;
  const nextLevelXp = user.level * 100;
  const expPercent = Math.min(
    100,
    Math.floor((currentLevelXp / nextLevelXp) * 100) || 0
  );
  let userTasks = tasks.filter((t) => t.userId === user.id && t.status !== 'deleted');
  if (userTasks.length === 0) {
    const defaults = [
      { title: '每日刷题 2 道', type: 'daily', xpReward: 15, coinsReward: 5, apValue: 2, attributeEffects: { fire: -5, earth: 3 }, skillXp: [] },
      { title: '健身 30 分钟', type: 'daily', xpReward: 20, coinsReward: 8, apValue: 3, attributeEffects: { wood: 5, fire: -8, water: 5 }, skillXp: [] },
      { title: '阅读 30 分钟', type: 'daily', xpReward: 15, coinsReward: 5, apValue: 2, attributeEffects: { earth: 4, water: 2 }, skillXp: [] },
    ];
    for (const d of defaults) {
      const t = {
        id: nextTaskId++,
        userId: user.id,
        title: d.title,
        type: d.type,
        status: 'pending',
        xpReward: d.xpReward,
        coinsReward: d.coinsReward,
        apValue: d.apValue,
        attributeEffects: d.attributeEffects || {},
        skillXp: d.skillXp || [],
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      tasks.push(t);
    }
    userTasks = tasks.filter((t) => t.userId === user.id && t.status !== 'deleted');
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      level: user.level,
      total_xp: user.total_xp,
      cash_balance: user.cash_balance,
    },
    experience: { current: currentLevelXp, nextLevel: nextLevelXp, percent: expPercent },
    attributes: user.attributes,
    currentBoss,
    challenges: userChallenges,
    challengesUnderCurrentBoss,
    skills: userSkills,
    dailyTasks: userTasks,
    rewardsSummary: { coins: user.coins, badges: [] },
    userSupplies: userSupplies.filter((us) => us.userId === user.id).map((us) => ({
      ...us,
      pack: supplyPacks.find((p) => p.id === us.supplyPackId) || {},
    })),
    homeExtras: buildHomeExtras(user),
  });
});

// ======== 里程碑 5：补给包定义与库存 CRUD、使用 API ========

app.get('/api/supply-packs', (req, res) => {
  return res.json({ supplyPacks });
});

app.get('/api/user-supplies', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = userSupplies
    .filter((us) => us.userId === user.id)
    .map((us) => ({ ...us, pack: supplyPacks.find((p) => p.id === us.supplyPackId) || {} }));
  return res.json({ userSupplies: list });
});

app.post('/api/user-supplies', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const { supplyPackId, quantity = 1 } = req.body || {};
  const pack = supplyPacks.find((p) => p.id === supplyPackId);
  if (!pack) return res.status(400).json({ error: '补给包不存在' });
  let us = userSupplies.find((u) => u.userId === user.id && u.supplyPackId === supplyPackId);
  if (us) {
    us.quantity = (us.quantity || 0) + quantity;
  } else {
    us = {
      id: nextUserSupplyId++,
      userId: user.id,
      supplyPackId,
      quantity,
      lastUsedAt: null,
    };
    userSupplies.push(us);
  }
  return res.json(us);
});

app.post('/api/user-supplies/:id/use', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const us = userSupplies.find((u) => u.id === id && u.userId === user.id);
  if (!us) return res.status(404).json({ error: '背包中无此补给' });
  if ((us.quantity || 0) < 1) return res.status(400).json({ error: '数量不足' });
  const pack = supplyPacks.find((p) => p.id === us.supplyPackId);
  if (!pack) return res.status(400).json({ error: '补给包定义不存在' });
  const now = Date.now();
  const cooldownMs = (pack.cooldownMinutes || 0) * 60 * 1000;
  if (us.lastUsedAt && now - us.lastUsedAt < cooldownMs) {
    const waitM = Math.ceil((cooldownMs - (now - us.lastUsedAt)) / 60000);
    return res.status(429).json({ error: `冷却中，请 ${waitM} 分钟后再用` });
  }
  const attrs = user.attributes;
  const directDeltas = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const [k, v] of Object.entries(pack.effects || {})) {
    const before = attrs[k] != null ? attrs[k] : 60;
    attrs[k] = clampAttr(before + v);
    directDeltas[k] = (directDeltas[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(pack.sideEffects || {})) {
    const before = attrs[k] != null ? attrs[k] : 60;
    attrs[k] = clampAttr(before + v);
    directDeltas[k] = (directDeltas[k] || 0) + v;
  }
  const elementMessages = applyElementInteractions(attrs, pack.effects || {});
  us.quantity = (us.quantity || 1) - 1;
  us.lastUsedAt = now;
  return res.json({
    success: true,
    attributes: user.attributes,
    elementInteractions: elementMessages,
    remaining: us.quantity,
  });
});

// 快速创建自定义补给包：基于情景模板或编辑表单
app.post('/api/supply-packs/custom', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) return res.status(400).json({ error: '名称不能为空' });
  const effects = body.effects && typeof body.effects === 'object' ? body.effects : {};
  const sideEffects = body.sideEffects && typeof body.sideEffects === 'object' ? body.sideEffects : {};
  const hasAnyEffect = Object.values(effects).some((v) => v) || Object.values(sideEffects).some((v) => v);
  if (!hasAnyEffect) return res.status(400).json({ error: '请至少设置一种属性效果' });

  const id = nextSupplyPackId++;
  const pack = {
    id,
    ownerUserId: user.id,
    scenario: body.scenario || null,
    name,
    description: (body.description || '').trim(),
    effects,
    sideEffects,
    cooldownMinutes: Number(body.cooldownMinutes || 0) || 0,
    icon: body.icon || '🎁',
  };
  supplyPacks.push(pack);

  const us = {
    id: nextUserSupplyId++,
    userId: user.id,
    supplyPackId: id,
    quantity: 1,
    lastUsedAt: null,
  };
  userSupplies.push(us);

  return res.json({ success: true, pack, userSupply: us });
});

// ======== 里程碑 2：人生水晶 / Boss / 挑战 / 技能 CRUD（简化版）========

// 获取当前用户的全部配置（方便前端一次加载）
app.get('/api/plan/overview', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }

  const userVisions = visions.filter((v) => v.userId === user.id);
  const userBosses = bosses.filter((b) => b.userId === user.id);
  const userChallenges = challenges.filter((c) => c.userId === user.id);
  const userSkills = skills.filter((s) => s.userId === user.id);

  return res.json({
    visions: userVisions,
    bosses: userBosses,
    challenges: userChallenges,
    skills: userSkills,
  });
});

// 创建 / 更新人生水晶（每个用户可以先简单支持 1 条）
app.post('/api/visions', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }
  const content = (req.body && req.body.content) || '';
  if (!content.trim()) {
    return res.status(400).json({ error: '人生水晶内容不能为空' });
  }
  let vision = visions.find((v) => v.userId === user.id);
  if (!vision) {
    vision = {
      id: nextVisionId++,
      userId: user.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    visions.push(vision);
  } else {
    vision.content = content.trim();
  }
  return res.json(vision);
});

// 创建 Boss
app.post('/api/bosses', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }
  const body = req.body || {};
  const title = (body.title || '').trim();
  const visionId = body.visionId;
  if (!title) {
    return res.status(400).json({ error: 'Boss 标题不能为空' });
  }
  if (!visionId) {
    return res.status(400).json({ error: '缺少 visionId' });
  }
  const boss = {
    id: nextBossId++,
    userId: user.id,
    visionId,
    title,
    description: body.description || '',
    status: '进行中',
    createdAt: new Date().toISOString(),
  };
  bosses.push(boss);
  return res.json(boss);
});

// 创建技能
app.post('/api/skills', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }
  const body = req.body || {};
  const name = (body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: '技能名称不能为空' });
  }
  const skill = {
    id: nextSkillId++,
    userId: user.id,
    name,
    primaryAttribute: body.primaryAttribute || null,
    secondaryAttribute: body.secondaryAttribute || null,
    level: 1,
    xp: 0,
    createdAt: new Date().toISOString(),
  };
  skills.push(skill);
  return res.json(skill);
});

// 创建挑战（小 Boss），并关联技能需求
app.post('/api/challenges', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }
  const body = req.body || {};
  const title = (body.title || '').trim();
  const bossId = body.bossId;
  if (!title) {
    return res.status(400).json({ error: '挑战标题不能为空' });
  }
  if (!bossId) {
    return res.status(400).json({ error: '缺少 bossId' });
  }

  const coreSkills = Array.isArray(body.coreSkills) ? body.coreSkills : [];
  const skillLevelRequirements =
    body.skillLevelRequirements && typeof body.skillLevelRequirements === 'object'
      ? body.skillLevelRequirements
      : {};

  const challenge = {
    id: nextChallengeId++,
    userId: user.id,
    bossId,
    title,
    coreSkills,
    skillLevelRequirements,
    createdAt: new Date().toISOString(),
  };
  challenges.push(challenge);
  return res.json(challenge);
});

// 里程碑 4：挑战详情 API（技能要求 vs 当前等级，用于仪表盘视图）
app.get('/api/challenges/:id/detail', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ error: '未授权或令牌无效' });
  }
  const id = parseInt(req.params.id, 10);
  const challenge = challenges.find((c) => c.id === id && c.userId === user.id);
  if (!challenge) {
    return res.status(404).json({ error: '挑战不存在' });
  }

  const reqs = challenge.skillLevelRequirements || {};
  const coreNames = Array.isArray(challenge.coreSkills) ? challenge.coreSkills : [];
  const skillNames = new Set([...Object.keys(reqs), ...coreNames]);
  const userSkillsList = skills.filter((s) => s.userId === user.id);

  const skillStatus = [];
  for (const skillName of skillNames) {
    const requiredLevel = typeof reqs[skillName] === 'number' ? reqs[skillName] : 1;
    const skill = userSkillsList.find((s) => s.name === skillName);
    const currentLevel = skill ? (skill.level || 0) : 0;
    let status = 'not_started';
    if (currentLevel >= requiredLevel) status = 'met';
    else if (currentLevel > 0) status = 'in_progress';
    skillStatus.push({
      skillName,
      requiredLevel,
      currentLevel,
      status,
      skillId: skill ? skill.id : null,
    });
  }

  // 基于 coreSkills 推荐学习资源
  const recResources = learningResources
    .filter((r) =>
      (r.coreSkills || []).some((name) => coreNames.includes(name)),
    )
    .slice(0, 5);

  return res.json({
    challenge: {
      id: challenge.id,
      bossId: challenge.bossId,
      title: challenge.title,
      coreSkills: challenge.coreSkills,
      skillLevelRequirements: challenge.skillLevelRequirements,
      createdAt: challenge.createdAt,
    },
    skillStatus,
    recommendedResources: recResources,
  });
});

// ======== 里程碑 6：作息打卡 API ========

function parseHHMM(str, fallback = '07:30') {
  const s = (str || fallback).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hh: 7, mm: 30, text: fallback };
  const hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return { hh, mm, text: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` };
}

function nextWakeAtFromHHMM(hhmm, now = new Date()) {
  const { hh, mm, text } = parseHHMM(hhmm);
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return { iso: d.toISOString(), text };
}

function addMinutes(isoOrDate, minutes) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : new Date(isoOrDate);
  return new Date(d.getTime() + minutes * 60 * 1000).toISOString();
}

function roundToHalf(x) {
  return Math.round(x * 2) / 2;
}

app.post('/api/schedule/log', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const { type } = req.body || {};
  if (type !== 'sleep' && type !== 'wake') {
    return res.status(400).json({ error: 'type 须为 sleep 或 wake' });
  }
  const at = new Date().toISOString();
  const log = {
    id: nextScheduleLogId++,
    userId: user.id,
    type,
    at,
    createdAt: at,
  };
  scheduleLogs.push(log);

  const rewards = { attributes: {}, elementInteractions: [], message: '' };
  const attrs = user.attributes;

  if (type === 'sleep') {
    attrs.water = clampAttr((attrs.water != null ? attrs.water : 60) + 2);
    rewards.attributes = { water: 2 };
    rewards.message = '早点休息，心情+2';
  } else {
    const userLogs = scheduleLogs.filter((l) => l.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
    const lastSleep = userLogs.find((l) => l.type === 'sleep');
    const lastWake = userLogs.find((l) => l.type === 'wake');
    let durationHours = 0;
    if (lastSleep && lastWake && new Date(lastWake.at) > new Date(lastSleep.at)) {
      durationHours = (new Date(lastWake.at) - new Date(lastSleep.at)) / (1000 * 60 * 60);
    } else if (lastSleep) {
      durationHours = (Date.now() - new Date(lastSleep.at)) / (1000 * 60 * 60);
    }
    const hour = new Date().getHours();
    const effects = {};
    if (durationHours >= 7 && durationHours <= 9) {
      effects.fire = 5;
      effects.water = 3;
      rewards.message = '睡眠 7–9 小时，精力+5 心情+3';
    } else if (durationHours >= 6 && durationHours < 7) {
      effects.fire = 3;
      effects.water = 1;
      rewards.message = '睡眠 6–7 小时，精力+3 心情+1';
    } else if (durationHours > 0) {
      effects.fire = 1;
      rewards.message = '已记录起床';
    }
    if (hour < 9) {
      effects.wood = (effects.wood || 0) + 2;
      rewards.message = (rewards.message || '') + ' 早睡早起，健康+2';
    }
    for (const [k, v] of Object.entries(effects)) {
      attrs[k] = clampAttr((attrs[k] != null ? attrs[k] : 60) + v);
      rewards.attributes[k] = (rewards.attributes[k] || 0) + v;
    }
    const interactionMessages = applyElementInteractions(attrs, effects);
    rewards.elementInteractions = interactionMessages;
  }

  return res.json({ success: true, log, rewards, attributes: user.attributes });
});

// ======== R90 模式：睡眠周期 = 能量单元 ========
// 简化版：用户设定固定起床时间 → 选择周期数 → 开始修行 → 起床结算

app.post('/api/schedule/r90/settings', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const wakeTime = parseHHMM(body.wakeTime || (user.r90 && user.r90.wakeTime) || '07:30').text;
  user.r90 = user.r90 || {};
  user.r90.wakeTime = wakeTime;
  return res.json({ success: true, wakeTime });
});

app.get('/api/schedule/r90/recommendations', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const wakeTime = (user.r90 && user.r90.wakeTime) || '07:30';
  const now = new Date();
  const wake = nextWakeAtFromHHMM(wakeTime, now);
  // 每周期 90 分钟 + 预估入睡潜伏期 15 分钟
  const latency = 15;
  const opts = [4, 5, 6].map((cycles) => {
    const mins = cycles * 90 + latency;
    const bedAt = addMinutes(wake.iso, -mins);
    return { cycles, bedAt, wakeAt: wake.iso, wakeTime: wake.text, latencyMin: latency };
  });
  return res.json({ wakeTime, wakeAt: wake.iso, options: opts });
});

app.post('/api/schedule/r90/start', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const wakeTime = parseHHMM(body.wakeTime || (user.r90 && user.r90.wakeTime) || '07:30').text;
  user.r90 = user.r90 || {};
  user.r90.wakeTime = wakeTime;
  const targetCycles = Math.max(1, Math.min(8, Number(body.targetCycles || 5)));
  const now = new Date();
  const wake = nextWakeAtFromHHMM(wakeTime, now);
  const latency = 15;
  const bedAt = addMinutes(wake.iso, -(targetCycles * 90 + latency));
  const at = now.toISOString();
  const log = {
    id: nextScheduleLogId++,
    userId: user.id,
    type: 'r90_start',
    at,
    createdAt: at,
    meta: { wakeTime, wakeAt: wake.iso, targetCycles, plannedBedAt: bedAt, latencyMin: latency },
  };
  scheduleLogs.push(log);

  // 睡前小奖励：水 +2（仪式感）
  const rewards = { attributes: { water: 2 }, elementInteractions: [], message: `进入R90修行：目标${targetCycles}周期（建议${new Date(bedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}入睡）` };
  user.attributes.water = clampAttr((user.attributes.water != null ? user.attributes.water : 60) + 2);
  return res.json({ success: true, log, rewards, attributes: user.attributes });
});

app.post('/api/schedule/r90/wake', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const now = new Date();
  const at = now.toISOString();
  const userLogs = scheduleLogs.filter((l) => l.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  const lastStart = userLogs.find((l) => l.type === 'r90_start');
  if (!lastStart) return res.status(400).json({ error: '没有找到R90开始记录，请先“开始今夜修行”' });

  const sleepStartAt = lastStart.at;
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(sleepStartAt).getTime()) / (1000 * 60)));
  const cyclesRaw = minutes / 90;
  const cyclesDone = roundToHalf(cyclesRaw);

  const targetCycles = (lastStart.meta && lastStart.meta.targetCycles) || 5;
  const wakeTime = (lastStart.meta && lastStart.meta.wakeTime) || ((user.r90 && user.r90.wakeTime) || '07:30');

  // 质量简化：深睡占比 50%，REM 占比 30%（都做半周期刻度）
  const deepCycles = Math.min(cyclesDone, roundToHalf(cyclesDone * 0.5));
  const remCycles = Math.min(cyclesDone, roundToHalf(cyclesDone * 0.3));
  const coreCycles = cyclesDone;

  // 五行映射（第一阶段：核心转换）
  // 木：完整周期数（向下取整）+ 深睡额外加成
  // 火：核心睡眠周期越多越高（每周期+2）
  // 水：REM 越多越好（每半周期+1）
  const effects = {};
  effects.wood = Math.floor(cyclesDone) + Math.floor(deepCycles);
  effects.fire = Math.round(coreCycles * 2);
  effects.water = Math.round(remCycles * 2); // half-cycle -> +1

  for (const [k, v] of Object.entries(effects)) {
    user.attributes[k] = clampAttr((user.attributes[k] != null ? user.attributes[k] : 60) + v);
  }
  const interactions = applyElementInteractions(user.attributes, effects);

  const log = {
    id: nextScheduleLogId++,
    userId: user.id,
    type: 'r90_wake',
    at,
    createdAt: at,
    meta: {
      wakeTime,
      sleepStartAt,
      wakeAt: at,
      targetCycles,
      minutes,
      cyclesRaw: Math.round(cyclesRaw * 100) / 100,
      cyclesDone,
      deepCycles,
      remCycles,
      coreCycles,
      effects,
      interactions,
      tip: cyclesDone < targetCycles ? `第${targetCycles}周期被中断，建议下次提前${Math.max(5, (targetCycles - cyclesDone) * 90)}分钟就寝` : '周期达成，气血充盈',
    },
  };
  scheduleLogs.push(log);

  const report = {
    targetCycles,
    cyclesDone,
    deepCycles,
    remCycles,
    coreCycles,
    sleepStartAt,
    wakeAt: at,
    minutes,
    effects,
    elementInteractions: interactions,
    tip: log.meta.tip,
  };

  return res.json({ success: true, log, report, rewards: { attributes: effects, elementInteractions: interactions, message: 'R90结算完成' }, attributes: user.attributes });
});

// 周期趋势总览：最近 30 天（按 r90_wake 归档）
app.get('/api/schedule/r90/overview', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const logs = scheduleLogs
    .filter((l) => l.userId === user.id && l.type === 'r90_wake' && new Date(l.at) >= since)
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  const byDay = {};
  logs.forEach((l) => {
    const d = new Date(l.at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const m = l.meta || {};
    if (!byDay[key]) {
      byDay[key] = {
        date: key,
        count: 0,
        totalCycles: 0,
        totalTarget: 0,
        deepCycles: 0,
        remCycles: 0,
      };
    }
    const row = byDay[key];
    row.count += 1;
    row.totalCycles += m.cyclesDone || 0;
    row.totalTarget += m.targetCycles || 0;
    row.deepCycles += m.deepCycles || 0;
    row.remCycles += m.remCycles || 0;
  });

  const days = Object.values(byDay).sort((a, b) => (a.date < b.date ? -1 : 1)).map((row) => {
    const avgCycles = row.count ? Math.round((row.totalCycles / row.count) * 10) / 10 : 0;
    const avgTarget = row.count ? Math.round((row.totalTarget / row.count) * 10) / 10 : 0;
    const stability = avgTarget > 0 ? Math.round((Math.min(1, avgCycles / avgTarget)) * 100) : 0;
    return {
      date: row.date,
      avgCycles,
      avgTarget,
      stability, // 0-100
      deepCycles: Math.round(row.deepCycles * 10) / 10,
      remCycles: Math.round(row.remCycles * 10) / 10,
    };
  });

  const avgCyclesAll = days.length ? Math.round((days.reduce((s, d) => s + d.avgCycles, 0) / days.length) * 10) / 10 : 0;
  const stableDays = days.filter((d) => d.stability >= 90).length;
  const stabilityRate = days.length ? Math.round((stableDays / days.length) * 100) : 0;

  return res.json({
    days,
    avgCycles: avgCyclesAll,
    stabilityRate,
    daysCount: days.length,
  });
});

app.get('/api/schedule/r90/day/:date', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' });
  const list = scheduleLogs
    .filter((l) => l.userId === user.id && l.type === 'r90_wake')
    .filter((l) => {
      const d = new Date(l.at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === date;
    })
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  const items = list.map((l) => {
    const m = l.meta || {};
    return {
      at: l.at,
      sleepStartAt: m.sleepStartAt,
      wakeAt: m.wakeAt,
      targetCycles: m.targetCycles,
      cyclesDone: m.cyclesDone,
      deepCycles: m.deepCycles,
      remCycles: m.remCycles,
      coreCycles: m.coreCycles,
      effects: m.effects || {},
      tip: m.tip || '',
    };
  });

  return res.json({ date, items });
});

app.get('/api/schedule/logs', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = scheduleLogs
    .filter((l) => l.userId === user.id)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 50);
  return res.json({ logs: list });
});

app.get('/api/schedule/summary', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const userLogs = scheduleLogs.filter((l) => l.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  const lastSleep = userLogs.find((l) => l.type === 'sleep');
  const lastWake = userLogs.find((l) => l.type === 'wake');
  let lastNightDurationHours = null;
  if (lastSleep && lastWake && new Date(lastWake.at) > new Date(lastSleep.at)) {
    lastNightDurationHours = (new Date(lastWake.at) - new Date(lastSleep.at)) / (1000 * 60 * 60);
  } else if (lastSleep) {
    lastNightDurationHours = (Date.now() - new Date(lastSleep.at)) / (1000 * 60 * 60);
  }
  return res.json({
    lastSleep: lastSleep ? lastSleep.at : null,
    lastWake: lastWake ? lastWake.at : null,
    lastNightDurationHours: lastNightDurationHours != null ? Math.round(lastNightDurationHours * 10) / 10 : null,
  });
});

// ======== 里程碑 7：财务管理与奖励兑换 ========

app.get('/api/finance/overview', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const month = monthKey();
  let goal = wealthGoals.find((g) => g.userId === user.id) || null;
  let budget = budgets.find((b) => b.userId === user.id && b.month === month) || null;
  if (!budget) {
    budget = {
      id: nextBudgetId++,
      userId: user.id,
      month,
      rewardLimitRmb: 200,
      rewardSpentRmb: 0,
      createdAt: new Date().toISOString(),
    };
    budgets.push(budget);
  }
  const list = transactions
    .filter((t) => t.userId === user.id)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 50);
  const monthTx = transactions.filter((t) => t.userId === user.id && String(t.at || '').startsWith(month));
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  return res.json({
    month,
    coins: user.coins || 0,
    cash_balance: user.cash_balance || 0,
    wealthGoal: goal,
    budget,
    transactions: list,
    summary: { income, expense },
  });
});

app.post('/api/wealth-goals', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const title = (body.title || '').trim();
  const targetAmount = Number(body.targetAmount || 0);
  if (!title || !targetAmount) return res.status(400).json({ error: '缺少 title 或 targetAmount' });
  let goal = wealthGoals.find((g) => g.userId === user.id);
  if (!goal) {
    goal = { id: nextWealthGoalId++, userId: user.id, title, targetAmount, createdAt: new Date().toISOString() };
    wealthGoals.push(goal);
  } else {
    goal.title = title;
    goal.targetAmount = targetAmount;
  }
  return res.json(goal);
});

app.post('/api/budgets/reward', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const month = body.month || monthKey();
  const rewardLimitRmb = Number(body.rewardLimitRmb || 0);
  if (!rewardLimitRmb) return res.status(400).json({ error: '缺少 rewardLimitRmb' });
  let b = budgets.find((x) => x.userId === user.id && x.month === month);
  if (!b) {
    b = { id: nextBudgetId++, userId: user.id, month, rewardLimitRmb, rewardSpentRmb: 0, createdAt: new Date().toISOString() };
    budgets.push(b);
  } else {
    b.rewardLimitRmb = rewardLimitRmb;
  }
  return res.json(b);
});

app.get('/api/transactions', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = transactions.filter((t) => t.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  return res.json({ transactions: list });
});

app.post('/api/transactions', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const type = body.type;
  const amount = Number(body.amount || 0);
  if (type !== 'income' && type !== 'expense') return res.status(400).json({ error: 'type 须为 income 或 expense' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amount 需为正数' });
  const at = body.at || new Date().toISOString();
  const tx = {
    id: nextTransactionId++,
    userId: user.id,
    type,
    amount,
    category: (body.category || '').trim() || (type === 'income' ? '收入' : '支出'),
    note: (body.note || '').trim() || '',
    at,
    createdAt: new Date().toISOString(),
    meta: body.meta || null,
  };
  transactions.push(tx);
  user.cash_balance = Number(user.cash_balance || 0) + (type === 'income' ? amount : -amount);
  return res.json({ success: true, transaction: tx, cash_balance: user.cash_balance });
});

app.get('/api/reward-items', (req, res) => {
  return res.json({ rewardItems });
});

app.get('/api/reward-redemptions', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = rewardRedemptions.filter((r) => r.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ rewardRedemptions: list });
});

// 兑换即记账：扣金币 + 写流水 + 记录兑换 + 消耗本月奖励预算
app.post('/api/rewards/redeem', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const { rewardItemId } = req.body || {};
  const item = rewardItems.find((x) => x.id === rewardItemId);
  if (!item) return res.status(400).json({ error: '商品不存在' });
  if ((user.coins || 0) < item.coinCost) return res.status(400).json({ error: '金币不足' });
  const month = monthKey();
  let budget = budgets.find((b) => b.userId === user.id && b.month === month);
  if (!budget) {
    budget = { id: nextBudgetId++, userId: user.id, month, rewardLimitRmb: 200, rewardSpentRmb: 0, createdAt: new Date().toISOString() };
    budgets.push(budget);
  }
  const remaining = Number(budget.rewardLimitRmb || 0) - Number(budget.rewardSpentRmb || 0);
  if (remaining < item.rmbValue) return res.status(400).json({ error: '本月自我奖励预算不足' });

  user.coins -= item.coinCost;
  budget.rewardSpentRmb = Number(budget.rewardSpentRmb || 0) + item.rmbValue;

  const redemption = {
    id: nextRewardRedemptionId++,
    userId: user.id,
    rewardItemId: item.id,
    coinCost: item.coinCost,
    rmbValue: item.rmbValue,
    month,
    createdAt: new Date().toISOString(),
  };
  rewardRedemptions.push(redemption);

  const tx = {
    id: nextTransactionId++,
    userId: user.id,
    type: 'expense',
    amount: item.rmbValue,
    category: '自我奖励',
    note: `兑换：${item.name}`,
    at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    meta: { redemptionId: redemption.id, coinCost: item.coinCost },
  };
  transactions.push(tx);
  user.cash_balance = Number(user.cash_balance || 0) - item.rmbValue;

  return res.json({
    success: true,
    coins: user.coins,
    cash_balance: user.cash_balance,
    budget: { ...budget, remaining: Number(budget.rewardLimitRmb || 0) - Number(budget.rewardSpentRmb || 0) },
    redemption,
    transaction: tx,
  });
});

// ======== 心愿池：用户自定义奖励 MVP ========

app.get('/api/wish-rewards', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = userWishRewards
    .filter((w) => w.userId === user.id)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || new Date(a.createdAt) - new Date(b.createdAt));
  return res.json({ wishes: list });
});

app.post('/api/wish-rewards', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const name = (body.name || '').trim();
  const targetCoins = Number(body.targetCoins || 0);
  if (!name || !targetCoins || targetCoins <= 0) return res.status(400).json({ error: '缺少 name 或 targetCoins' });
  const wish = {
    id: nextUserWishRewardId++,
    userId: user.id,
    name,
    description: (body.description || '').trim(),
    category: (body.category || '体验').trim(),
    targetCoins,
    estimatedRmb: Number(body.estimatedRmb || 0) || 0,
    imageUrl: (body.imageUrl || '').trim() || null,
    linkedBossId: body.linkedBossId || null,
    status: 'saving',
    currentCoins: 0,
    priority: Number(body.priority || 0) || 0,
    isPublic: !!body.isPublic,
    createdAt: new Date().toISOString(),
  };
  userWishRewards.push(wish);
  return res.json({ success: true, wish });
});

app.patch('/api/wish-rewards/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const wish = userWishRewards.find((w) => w.id === id && w.userId === user.id);
  if (!wish) return res.status(404).json({ error: '心愿不存在' });
  const body = req.body || {};
  if (body.name != null) wish.name = String(body.name || '').trim();
  if (body.description != null) wish.description = String(body.description || '').trim();
  if (body.category != null) wish.category = String(body.category || '').trim();
  if (body.targetCoins != null) {
    const t = Number(body.targetCoins || 0);
    if (t > 0) wish.targetCoins = t;
  }
  if (body.estimatedRmb != null) wish.estimatedRmb = Number(body.estimatedRmb || 0) || 0;
  if (body.imageUrl != null) wish.imageUrl = String(body.imageUrl || '').trim();
  if (body.priority != null) wish.priority = Number(body.priority || 0) || 0;
  if (body.isPublic != null) wish.isPublic = !!body.isPublic;
  return res.json({ success: true, wish });
});

// 为心愿储蓄金币：从用户金币扣除，累加到 currentCoins
app.post('/api/wish-rewards/:id/save', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const wish = userWishRewards.find((w) => w.id === id && w.userId === user.id);
  if (!wish) return res.status(404).json({ error: '心愿不存在' });
  const amount = Number((req.body && req.body.amountCoins) || 0);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'amountCoins 需为正数' });
  if ((user.coins || 0) < amount) return res.status(400).json({ error: '金币不足' });

  user.coins -= amount;
  wish.currentCoins = (wish.currentCoins || 0) + amount;
  if (wish.currentCoins >= wish.targetCoins && wish.status !== 'redeemed') wish.status = 'ready';

  return res.json({ success: true, wish, coins: user.coins });
});

// 兑换心愿：不再额外扣金币（已储蓄），只做记账 + 标记 redeemed
app.post('/api/wish-rewards/:id/redeem', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const wish = userWishRewards.find((w) => w.id === id && w.userId === user.id);
  if (!wish) return res.status(404).json({ error: '心愿不存在' });
  if (wish.status !== 'ready' && wish.status !== 'saving') return res.status(400).json({ error: '该心愿已兑换或不可兑换' });
  if (wish.currentCoins < wish.targetCoins) return res.status(400).json({ error: '金币尚未攒够，暂不可兑换' });

  const month = monthKey();
  let budget = budgets.find((b) => b.userId === user.id && b.month === month);
  if (!budget) {
    budget = { id: nextBudgetId++, userId: user.id, month, rewardLimitRmb: 200, rewardSpentRmb: 0, createdAt: new Date().toISOString() };
    budgets.push(budget);
  }
  const value = Number(wish.estimatedRmb || 0) || 0;
  if (value > 0) {
    const remaining = Number(budget.rewardLimitRmb || 0) - Number(budget.rewardSpentRmb || 0);
    if (remaining < value) return res.status(400).json({ error: '本月自我奖励预算不足，暂不可兑换该心愿' });
    budget.rewardSpentRmb = Number(budget.rewardSpentRmb || 0) + value;
  }

  wish.status = 'redeemed';

  if (value > 0) {
    const redemption = {
      id: nextRewardRedemptionId++,
      userId: user.id,
      source: 'wish',
      rewardItemId: null,
      wishId: wish.id,
      name: wish.name,
      coinCost: wish.targetCoins,
      rmbValue: value,
      month,
      createdAt: new Date().toISOString(),
    };
    rewardRedemptions.push(redemption);

    const tx = {
      id: nextTransactionId++,
      userId: user.id,
      type: 'expense',
      amount: value,
      category: '心愿奖励',
      note: `心愿：${wish.name}`,
      at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      meta: { wishId: wish.id, coinCost: wish.targetCoins },
    };
    transactions.push(tx);
    user.cash_balance = Number(user.cash_balance || 0) - value;
  }

  return res.json({
    success: true,
    wish,
    coins: user.coins,
    cash_balance: user.cash_balance,
    budget,
  });
});

// ======== 励志墙：帖子 / 点赞 / 评论 / 收藏 ========

app.post('/api/motivation/posts', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const text = (body.text || '').trim();
  if (!text) return res.status(400).json({ error: '内容不能为空' });
  const post = {
    id: nextMotivationPostId++,
    userId: user.id,
    text,
    category: (body.category || 'general').trim(),
    linkedBossId: body.linkedBossId || null,
    linkedChallengeId: body.linkedChallengeId || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    createdAt: new Date().toISOString(),
  };
  motivationPosts.push(post);
  return res.json({ success: true, post });
});

app.get('/api/motivation/posts', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const filter = req.query.filter || 'recommend';
  const challengeId = req.query.challengeId ? Number(req.query.challengeId) : null;
  let list = motivationPosts.slice();
  if (challengeId) {
    list = list.filter((p) => p.linkedChallengeId === challengeId);
  } else if (filter === 'mine') {
    list = list.filter((p) => p.userId === user.id);
  } else if (filter === 'milestone') {
    list = list.filter((p) => p.linkedBossId != null);
  }
  if (filter === 'recommend' && !challengeId) {
    list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt));
  } else {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  // 标记当前用户是否已点赞/收藏
  const likedSet = new Set(motivationLikes.filter((l) => l.userId === user.id).map((l) => l.postId));
  const bookmarkSet = new Set(motivationBookmarks.filter((b) => b.userId === user.id).map((b) => b.postId));
  const withFlags = list.slice(0, 50).map((p) => ({
    ...p,
    liked: likedSet.has(p.id),
    bookmarked: bookmarkSet.has(p.id),
  }));
  return res.json({ posts: withFlags });
});

app.post('/api/motivation/posts/:id/like', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const post = motivationPosts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const idx = motivationLikes.findIndex((l) => l.userId === user.id && l.postId === id);
  if (idx === -1) {
    motivationLikes.push({ userId: user.id, postId: id });
    post.likesCount = (post.likesCount || 0) + 1;
    return res.json({ success: true, liked: true, likesCount: post.likesCount });
  } else {
    motivationLikes.splice(idx, 1);
    post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    return res.json({ success: true, liked: false, likesCount: post.likesCount });
  }
});

app.post('/api/motivation/posts/:id/bookmark', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const post = motivationPosts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const idx = motivationBookmarks.findIndex((b) => b.userId === user.id && b.postId === id);
  if (idx === -1) {
    motivationBookmarks.push({ userId: user.id, postId: id });
    post.bookmarksCount = (post.bookmarksCount || 0) + 1;
    return res.json({ success: true, bookmarked: true, bookmarksCount: post.bookmarksCount });
  } else {
    motivationBookmarks.splice(idx, 1);
    post.bookmarksCount = Math.max(0, (post.bookmarksCount || 0) - 1);
    return res.json({ success: true, bookmarked: false, bookmarksCount: post.bookmarksCount });
  }
});

app.get('/api/motivation/posts/:id/comments', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const post = motivationPosts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const list = motivationComments
    .filter((c) => c.postId === id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return res.json({ comments: list });
});

app.post('/api/motivation/posts/:id/comments', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const post = motivationPosts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  const body = req.body || {};
  const text = (body.text || '').trim();
  if (!text) return res.status(400).json({ error: '评论不能为空' });
  const c = {
    id: nextMotivationCommentId++,
    postId: id,
    userId: user.id,
    text,
    createdAt: new Date().toISOString(),
  };
  motivationComments.push(c);
  post.commentsCount = (post.commentsCount || 0) + 1;
  return res.json({ success: true, comment: c });
});

// ======== 里程碑 13：新用户引导问卷 & 学习资源 ========

// 获取引导问卷（不暴露内部属性加成细节）
app.get('/api/onboarding/questions', (req, res) => {
  return res.json({
    questions: onboardingQuestions.map((q) => ({
      id: q.id,
      key: q.key,
      text: q.text,
      options: q.options.map((o) => ({ value: o.value, label: o.label })),
    })),
  });
});

// 提交问卷答案，进行初始建模：属性微调 + 初始目标/技能
app.post('/api/onboarding/answers', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (!answers.length) return res.status(400).json({ error: 'answers 不能为空' });

  const attrBonus = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const tagCounts = {};

  answers.forEach((ans) => {
    const q = onboardingQuestions.find((x) => x.id === ans.questionId || x.key === ans.key);
    if (!q) return;
    const opt = q.options.find((o) => o.value === ans.value);
    if (!opt) return;
    Object.entries(opt.effects || {}).forEach(([k, v]) => {
      if (attrBonus[k] == null) attrBonus[k] = 0;
      attrBonus[k] += Number(v || 0);
    });
    (opt.tags || []).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  // 应用五行加成
  const attrs = user.attributes || (user.attributes = { wood: 60, fire: 60, earth: 60, metal: 60, water: 60 });
  Object.entries(attrBonus).forEach(([k, v]) => {
    if (!v) return;
    const before = attrs[k] != null ? attrs[k] : 60;
    attrs[k] = clampAttr(before + v);
  });

  // 选择主倾向标签
  const topTag =
    Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'creativity';

  // 基于主倾向，生成一个战略目标 / Boss / 初始技能
  const nowIso = new Date().toISOString();
  const mapping = {
    creativity: {
      visionContent: '培养创意表达，让自己敢说、会写、能呈现',
      bossTitle: '创意表达 Boss',
      skills: ['创意写作', '表达训练', '内容输出'],
    },
    logic: {
      visionContent: '提升逻辑思维与数据分析能力',
      bossTitle: '数据分析 Boss',
      skills: ['数据分析', 'Excel', 'Python'],
    },
    health: {
      visionContent: '打造稳定作息与健康体能基础',
      bossTitle: '健康生活 Boss',
      skills: ['力量训练', '有氧运动', '睡眠管理'],
    },
    career: {
      visionContent: '让职业发展有清晰路径与节奏',
      bossTitle: '职业发展 Boss',
      skills: ['简历优化', '面试技巧', '职场沟通'],
    },
    emotion: {
      visionContent: '学会稳定情绪，建立内心安全感',
      bossTitle: '情绪管理 Boss',
      skills: ['情绪觉察', '正念练习', '压力管理'],
    },
  };

  const cfg = mapping[topTag] || mapping.creativity;

  // 若该用户还没有人生水晶/主 Boss，则创建一套初始配置
  let vision = visions.find((v) => v.userId === user.id);
  if (!vision) {
    vision = {
      id: nextVisionId++,
      userId: user.id,
      content: cfg.visionContent,
      createdAt: nowIso,
    };
    visions.push(vision);
  }

  let boss = bosses.find((b) => b.userId === user.id);
  if (!boss) {
    boss = {
      id: nextBossId++,
      userId: user.id,
      visionId: vision.id,
      title: cfg.bossTitle,
      description: '',
      status: '进行中',
      createdAt: nowIso,
      controlPercent: 100,
    };
    bosses.push(boss);
  }

  // 推荐初始技能（若不存在则创建）
  const createdSkills = [];
  (cfg.skills || []).forEach((name) => {
    const exists = skills.find((s) => s.userId === user.id && s.name === name);
    if (exists) {
      createdSkills.push(exists);
      return;
    }
    const s = {
      id: nextSkillId++,
      userId: user.id,
      name,
      primaryAttribute: null,
      secondaryAttribute: null,
      level: 1,
      xp: 0,
      createdAt: nowIso,
    };
    skills.push(s);
    createdSkills.push(s);
  });

  user.onboarded_at = nowIso;
  logWorldEvent(
    user.id,
    'onboarding',
    '完成了人生玩家初次设定',
    '根据你的偏好，我们为你生成了初始目标、Boss 与技能树。',
    { topTag, attrBonus, visionId: vision.id, bossId: boss.id },
  );

  return res.json({
    success: true,
    topTag,
    attrBonus,
    vision,
    boss,
    skills: createdSkills,
    attributes: user.attributes,
  });
});

// 学习资源查询：按技能名或标签模糊匹配
app.get('/api/resources', (req, res) => {
  const skill = (req.query.skill || '').trim();
  const tag = (req.query.tag || '').trim();
  let list = learningResources.slice();
  if (skill) {
    list = list.filter((r) =>
      (r.coreSkills || []).some((s) => String(s).includes(skill)),
    );
  }
  if (tag) {
    list = list.filter((r) =>
      (r.tags || []).some((t) => String(t).includes(tag)),
    );
  }
  return res.json({ resources: list });
});

// ======== 时光胶囊 ========

app.post('/api/time-capsules', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const title = (body.title || '').trim() || '写给未来的我';
  const message = (body.message || '').trim();
  if (!message) return res.status(400).json({ error: '内容不能为空' });
  const openAt = body.openAt ? new Date(body.openAt).toISOString() : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const cap = {
    id: nextTimeCapsuleId++,
    userId: user.id,
    title,
    message,
    openAt,
    createdAt: new Date().toISOString(),
    openedAt: null,
  };
  timeCapsules.push(cap);
  return res.json({ success: true, capsule: cap });
});

app.get('/api/time-capsules', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const now = new Date();
  const list = timeCapsules
    .filter((c) => c.userId === user.id)
    .sort((a, b) => new Date(a.openAt) - new Date(b.openAt));
  const enriched = list.map((c) => {
    const openedAt = c.openedAt;
    const opened = openedAt != null || new Date(c.openAt) <= now;
    return { ...c, opened, openedAt };
  });
  return res.json({ capsules: enriched });
});

app.post('/api/time-capsules/:id/open', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const cap = timeCapsules.find((c) => c.id === id && c.userId === user.id);
  if (!cap) return res.status(404).json({ error: '时光胶囊不存在' });
  if (!cap.openedAt) cap.openedAt = new Date().toISOString();
  return res.json({ success: true, capsule: cap });
});

// ======== 战略沙盘：节点与技能 ========

app.get('/api/strategic-nodes', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = strategicNodes
    .filter((n) => n.userId === user.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const skillMap = {};
  nodeSkills.forEach((ns) => {
    if (!skillMap[ns.nodeId]) skillMap[ns.nodeId] = [];
    skillMap[ns.nodeId].push(ns);
  });
  const withSkills = list.map((n) => ({
    ...n,
    skills: skillMap[n.id] || [],
  }));
  return res.json({ nodes: withSkills });
});

app.post('/api/strategic-nodes', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const type = body.type === 'campaign' || body.type === 'task' ? body.type : 'goal';
  const title = (body.title || '').trim();
  if (!title) return res.status(400).json({ error: '标题不能为空' });
  const nowIso = new Date().toISOString();
  const node = {
    id: nextStrategicNodeId++,
    userId: user.id,
    parentId: body.parentId || null,
    type,
    title,
    description: (body.description || '').trim(),
    positionX: body.positionX || 0,
    positionY: body.positionY || 0,
    attributes: body.attributes || {},
    status: body.status || 'planning',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  strategicNodes.push(node);
  return res.json({ success: true, node });
});

app.patch('/api/strategic-nodes/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const node = strategicNodes.find((n) => n.id === id && n.userId === user.id);
  if (!node) return res.status(404).json({ error: '节点不存在' });
  const body = req.body || {};
  if (body.title != null) node.title = String(body.title || '').trim();
  if (body.description != null) node.description = String(body.description || '').trim();
  if (body.status != null) node.status = body.status;
  if (body.positionX != null) node.positionX = body.positionX;
  if (body.positionY != null) node.positionY = body.positionY;
  if (body.attributes != null && typeof body.attributes === 'object') {
    node.attributes = { ...(node.attributes || {}), ...body.attributes };
  }
  node.updatedAt = new Date().toISOString();
  return res.json({ success: true, node });
});

app.delete('/api/strategic-nodes/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const idx = strategicNodes.findIndex((n) => n.id === id && n.userId === user.id);
  if (idx === -1) return res.status(404).json({ error: '节点不存在' });
  strategicNodes.splice(idx, 1);
  for (let i = nodeSkills.length - 1; i >= 0; i--) {
    if (nodeSkills[i].nodeId === id) nodeSkills.splice(i, 1);
  }
  return res.json({ success: true });
});

app.post('/api/strategic-nodes/:id/skills', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const node = strategicNodes.find((n) => n.id === id && n.userId === user.id);
  if (!node) return res.status(404).json({ error: '节点不存在' });
  const body = req.body || {};
  const skillId = Number(body.skillId || 0);
  if (!skillId) return res.status(400).json({ error: '缺少 skillId' });
  const requiredLevel = Number(body.requiredLevel || 1);
  const exists = nodeSkills.find((ns) => ns.nodeId === id && ns.skillId === skillId);
  if (exists) {
    exists.requiredLevel = requiredLevel;
  } else {
    nodeSkills.push({ nodeId: id, skillId, requiredLevel });
  }
  return res.json({ success: true });
});

// ======== 里程碑 8：娱乐记录与复盘 ========

// 娱乐打卡：提升心情（水）+5，记一条日志
app.post('/api/entertainment/log', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const activity = (body.activity || '').trim() || '娱乐';
  const duration = Number(body.duration || 0);
  const at = body.at || new Date().toISOString();
  const log = { id: nextEntertainmentLogId++, userId: user.id, activity, duration, at, createdAt: new Date().toISOString() };
  entertainmentLogs.push(log);
  // 简单奖励：心情 +5
  user.attributes.water = clampAttr((user.attributes.water != null ? user.attributes.water : 60) + 5);
  return res.json({ success: true, log, attributes: user.attributes });
});

app.get('/api/entertainment/logs', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = entertainmentLogs.filter((l) => l.userId === user.id).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 50);
  return res.json({ logs: list });
});

// ======== 模板化复盘：模板 CRUD / 广场 / 克隆 ========

app.get('/api/retrospect-templates', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const mine = retrospectTemplates.filter((t) => t.userId === user.id);
  const system = retrospectTemplates.filter((t) => t.userId === null);
  return res.json({ mine, system });
});

app.get('/api/retrospect-templates/public', (req, res) => {
  const list = retrospectTemplates
    .filter((t) => t.isPublic)
    .sort((a, b) => (b.usedCount || 0) - (a.usedCount || 0))
    .slice(0, 50);
  return res.json({ templates: list });
});

app.post('/api/retrospect-templates', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const title = (body.title || '').trim();
  const questions = Array.isArray(body.questions) ? body.questions : null;
  if (!title || !questions || questions.length === 0) return res.status(400).json({ error: '缺少 title 或 questions' });
  const tpl = {
    id: nextRetrospectTemplateId++,
    userId: user.id,
    title,
    description: body.description || '',
    questions,
    category: body.category || '自定义',
    isPublic: !!body.isPublic,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };
  retrospectTemplates.push(tpl);
  return res.json({ success: true, template: tpl });
});

app.patch('/api/retrospect-templates/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const tpl = retrospectTemplates.find((t) => t.id === id);
  if (!tpl) return res.status(404).json({ error: '模板不存在' });
  if (tpl.userId !== user.id) return res.status(403).json({ error: '无权限编辑该模板' });
  const body = req.body || {};
  if (body.title !== undefined) tpl.title = String(body.title).trim();
  if (body.description !== undefined) tpl.description = String(body.description);
  if (body.category !== undefined) tpl.category = String(body.category);
  if (body.isPublic !== undefined) tpl.isPublic = !!body.isPublic;
  if (body.questions !== undefined && Array.isArray(body.questions)) tpl.questions = body.questions;
  return res.json({ success: true, template: tpl });
});

app.delete('/api/retrospect-templates/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const idx = retrospectTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: '模板不存在' });
  const tpl = retrospectTemplates[idx];
  if (tpl.userId !== user.id) return res.status(403).json({ error: '无权限删除该模板' });
  retrospectTemplates.splice(idx, 1);
  return res.json({ success: true });
});

app.post('/api/retrospect-templates/:id/clone', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const src = retrospectTemplates.find((t) => t.id === id);
  if (!src) return res.status(404).json({ error: '模板不存在' });
  if (!(src.isPublic || src.userId === null)) return res.status(403).json({ error: '该模板不可克隆' });
  const tpl = {
    id: nextRetrospectTemplateId++,
    userId: user.id,
    title: src.title + '（克隆）',
    description: src.description,
    questions: src.questions,
    category: src.category,
    isPublic: false,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };
  retrospectTemplates.push(tpl);
  return res.json({ success: true, template: tpl });
});

// ======== 模板化复盘：保存记录 + 历史 + 简单分析 ========

app.post('/api/retrospects', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const type = body.type || 'quick';
  const title = (body.title || '').trim() || '复盘';

  // 兼容旧三问：q1/q2/q3 -> classic3 answers
  let templateId = body.templateId;
  let answers = Array.isArray(body.answers) ? body.answers : null;
  if (!templateId && (body.q1 || body.q2 || body.q3)) {
    templateId = 1;
    answers = [
      { questionId: 0, answer: (body.q1 || '').trim() },
      { questionId: 1, answer: (body.q2 || '').trim() },
      { questionId: 2, answer: (body.q3 || '').trim() },
    ];
  }

  if (!templateId) return res.status(400).json({ error: '缺少 templateId' });
  const tpl = retrospectTemplates.find((t) => t.id === templateId);
  if (!tpl) return res.status(400).json({ error: '模板不存在' });
  if (!(tpl.userId === null || tpl.userId === user.id || tpl.isPublic)) return res.status(403).json({ error: '无权使用该模板' });
  if (!answers) return res.status(400).json({ error: '缺少 answers' });

  tpl.usedCount = (tpl.usedCount || 0) + 1;
  const r = {
    id: nextRetrospectId++,
    userId: user.id,
    type,
    title,
    templateId,
    answers,
    createdAt: new Date().toISOString(),
  };
  retrospects.push(r);
  // 写入一条站内通知：完成一次复盘
  pushNotification(
    user.id,
    'retrospect',
    '完成一次复盘',
    `你刚刚完成了复盘「${title}」，可以去看看系统为你准备的补给和灵感。`,
    '/home', // 主页会展示 systemSuggestions
  );
  return res.json({ success: true, retrospect: r });
});

app.get('/api/retrospects', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = retrospects
    .filter((r) => r.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // 简单分析：最近 10 条中，抽取文本答案词频 top3 + 评分平均（若存在 rating）
  const recent = list.slice(0, 10);
  const text = recent
    .map((r) => (r.answers || []).map((a) => (typeof a.answer === 'string' ? a.answer : '')).join(' '))
    .join(' ');
  const words = text.split(/[\s，。、“”‘’；;,.!？?]/).filter(Boolean);
  const freq = {};
  words.forEach((w) => {
    if (w.length <= 1) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  const patterns = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, c]) => ({ word: w, count: c }));

  const ratings = [];
  recent.forEach((r) => {
    (r.answers || []).forEach((a) => {
      if (typeof a.answer === 'number') ratings.push(a.answer);
    });
  });
  const ratingAvg = ratings.length ? Math.round((ratings.reduce((s, x) => s + x, 0) / ratings.length) * 10) / 10 : null;

  return res.json({ retrospects: list, patterns, ratingAvg });
});

// ======== 复盘 v2：双模式融合编辑器（qa_mixed / free_text）========

app.post('/api/retrospects/v2', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const title = (body.title || '').trim() || '复盘';
  const contentType = body.contentType === 'free_text' ? 'free_text' : 'qa_mixed';
  const nowIso = new Date().toISOString();

  const record = {
    id: nextRetrospectId++,
    userId: user.id,
    title,
    contentType,
    freeContent: contentType === 'free_text' ? String(body.freeContent || '') : null,
    qaData: contentType === 'qa_mixed' ? (body.qaData && typeof body.qaData === 'object' ? body.qaData : {}) : null,
    linkedTaskId: body.linkedTaskId || null,
    linkedChallengeId: body.linkedChallengeId || null,
    moodRating: body.moodRating || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  retrospectsV2.push(record);

  // 若 qaData.template_id 存在，usedCount +1
  const tplId = record.qaData && record.qaData.template_id;
  if (tplId) {
    const tpl = retrospectTemplates.find((t) => t.id === tplId);
    if (tpl) tpl.usedCount = (tpl.usedCount || 0) + 1;
  }

  // 写入一条站内通知：完成一次复盘（v2）
  pushNotification(
    user.id,
    'retrospect',
    '完成一次复盘',
    `你刚刚完成了复盘「${title}」，可以去看看系统为你准备的补给和灵感。`,
    '/home',
  );

  return res.json({ success: true, retrospect: record });
});

app.get('/api/retrospects/v2', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = retrospectsV2
    .filter((r) => r.userId === user.id)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const recent = list.slice(0, 10);
  const collectText = (r) => {
    if (r.contentType === 'free_text') return r.freeContent || '';
    const qa = r.qaData || {};
    // 优先使用 blocks（支持混排顺序）；兼容旧 questions/free_sections
    if (Array.isArray(qa.blocks) && qa.blocks.length) {
      return qa.blocks
        .map((b) => {
          if (!b) return '';
          if (b.type === 'question') return typeof b.answer === 'string' ? b.answer : '';
          if (b.type === 'free') return b.content || '';
          return '';
        })
        .join(' ');
    }
    const qText = (qa.questions || []).map((q) => (typeof q.answer === 'string' ? q.answer : '')).join(' ');
    const free = (qa.free_sections || []).map((s) => (s && s.content) || '').join(' ');
    return qText + ' ' + free;
  };
  const text = recent.map(collectText).join(' ');
  const words = text.split(/[\s，。、“”‘’；;,.!？?]/).filter(Boolean);
  const freq = {};
  words.forEach((w) => {
    if (w.length <= 1) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  const patterns = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, c]) => ({ word: w, count: c }));

  const ratings = [];
  recent.forEach((r) => {
    if (r.contentType !== 'qa_mixed') return;
    const qa = r.qaData || {};
    if (Array.isArray(qa.blocks) && qa.blocks.length) {
      qa.blocks.forEach((b) => {
        if (b && b.type === 'question' && b.qType === 'rating' && typeof b.answer === 'number') ratings.push(b.answer);
      });
      return;
    }
    (qa.questions || []).forEach((q) => {
      if (q && q.type === 'rating' && typeof q.answer === 'number') ratings.push(q.answer);
    });
  });
  const ratingAvg = ratings.length ? Math.round((ratings.reduce((s, x) => s + x, 0) / ratings.length) * 10) / 10 : null;

  return res.json({ retrospects: list, patterns, ratingAvg });
});

// ======== 里程碑 10：站内通知中心（简版）========

// 获取当前用户的通知列表（按时间倒序）
app.get('/api/notifications', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const list = notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  return res.json({ notifications: list });
});

// 标记通知为已读
app.post('/api/notifications/:id/read', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const n = notifications.find((x) => x.id === id && x.userId === user.id);
  if (!n) return res.status(404).json({ error: '通知不存在' });
  n.read = true;
  return res.json({ success: true });
});

// ======== 里程碑 11：社交网络与协作 ========

// 好友列表
app.get('/api/friends', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const myFriendIds = friendships
    .filter((f) => f.userId === user.id || f.friendUserId === user.id)
    .map((f) => (f.userId === user.id ? f.friendUserId : f.userId));
  const uniqueIds = Array.from(new Set(myFriendIds));
  const list = uniqueIds
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean)
    .map(getUserPublicProfile);
  return res.json({ friends: list });
});

// 添加好友（双向 / 轻量关注）
app.post('/api/friends/:friendId', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const friendId = parseInt(req.params.friendId, 10);
  if (!friendId || friendId === user.id) {
    return res.status(400).json({ error: 'friendId 非法' });
  }
  const friend = users.find((u) => u.id === friendId);
  if (!friend) return res.status(404).json({ error: '用户不存在' });
  if (areFriends(user.id, friendId)) {
    return res.json({ success: true, already: true });
  }
  const nowIso = new Date().toISOString();
  friendships.push({
    id: nextFriendshipId++,
    userId: user.id,
    friendUserId: friendId,
    createdAt: nowIso,
  });
  return res.json({ success: true });
});

// “可能认识的人”：根据 Boss 标题与技能名称的重合度简单推荐
app.get('/api/friends/suggestions', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });

  const myBossTitles = bosses
    .filter((b) => b.userId === user.id)
    .map((b) => (b.title || '').trim())
    .filter(Boolean);
  const mySkillNames = skills
    .filter((s) => s.userId === user.id)
    .map((s) => (s.name || '').trim())
    .filter(Boolean);

  const scored = [];
  for (const other of users) {
    if (other.id === user.id) continue;
    if (areFriends(user.id, other.id)) continue;
    const otherBossTitles = bosses
      .filter((b) => b.userId === other.id)
      .map((b) => (b.title || '').trim())
      .filter(Boolean);
    const otherSkillNames = skills
      .filter((s) => s.userId === other.id)
      .map((s) => (s.name || '').trim())
      .filter(Boolean);
    let score = 0;
    myBossTitles.forEach((t) => {
      if (otherBossTitles.includes(t)) score += 3;
    });
    mySkillNames.forEach((n) => {
      if (otherSkillNames.includes(n)) score += 1;
    });
    if (score > 0) {
      scored.push({ other, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.other.id - b.other.id);
  const suggestions = scored
    .slice(0, 10)
    .map((row) => ({
      ...getUserPublicProfile(row.other),
      matchScore: row.score,
    }));
  return res.json({ suggestions });
});

// 好友动态：聚合好友最近的成就 / 复盘 / 励志
app.get('/api/friends/feed', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const myFriendIds = friendships
    .filter((f) => f.userId === user.id || f.friendUserId === user.id)
    .map((f) => (f.userId === user.id ? f.friendUserId : f.userId));
  const friendIdSet = new Set(myFriendIds);
  if (!friendIdSet.size) return res.json({ feed: [] });

  const now = new Date();
  const since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 最近 3 天

  const feed = [];

  // 任务完成通知
  notifications
    .filter(
      (n) =>
        friendIdSet.has(n.userId) &&
        (n.type === 'task_complete' || n.type === 'retrospect') &&
        new Date(n.createdAt) >= since,
    )
    .forEach((n) => {
      feed.push({
        type: 'notification',
        userId: n.userId,
        title: n.title,
        content: n.content,
        createdAt: n.createdAt,
      });
    });

  // 好友在励志墙的最新发言
  motivationPosts
    .filter((p) => friendIdSet.has(p.userId) && new Date(p.createdAt) >= since)
    .forEach((p) => {
      feed.push({
        type: 'motivation',
        userId: p.userId,
        title: '发布了一条励志瞬间',
        content: p.text,
        createdAt: p.createdAt,
      });
    });

  feed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const enriched = feed.slice(0, 50).map((item) => {
    const profile = getUserPublicProfile(users.find((u) => u.id === item.userId));
    return { ...item, user: profile };
  });

  return res.json({ feed: enriched });
});

// 公会创建：设置公会目标
app.post('/api/guilds', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const name = (body.name || '').trim();
  const goalText = (body.goalText || '').trim();
  if (!name) return res.status(400).json({ error: '公会名称不能为空' });
  if (!goalText) return res.status(400).json({ error: '请为公会设定一个目标' });

  const nowIso = new Date().toISOString();
  const guild = {
    id: nextGuildId++,
    name,
    ownerUserId: user.id,
    goalText,
    level: 1,
    xp: 0,
    createdAt: nowIso,
  };
  guilds.push(guild);

  guildMembers.push({
    id: nextGuildMemberId++,
    guildId: guild.id,
    userId: user.id,
    role: 'leader',
    joinedAt: nowIso,
  });

  return res.json({ success: true, guild });
});

// 加入公会
app.post('/api/guilds/:id/join', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const guild = guilds.find((g) => g.id === id);
  if (!guild) return res.status(404).json({ error: '公会不存在' });
  if (guildMembers.some((m) => m.guildId === id && m.userId === user.id)) {
    return res.json({ success: true, already: true });
  }
  guildMembers.push({
    id: nextGuildMemberId++,
    guildId: id,
    userId: user.id,
    role: 'member',
    joinedAt: new Date().toISOString(),
  });
  return res.json({ success: true });
});

// 查看我的公会及成员
app.get('/api/guilds/me', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const myMemberships = guildMembers.filter((m) => m.userId === user.id);
  if (!myMemberships.length) return res.json({ guilds: [] });
  const myGuildIds = Array.from(new Set(myMemberships.map((m) => m.guildId)));
  const list = myGuildIds.map((gid) => {
    const g = guilds.find((x) => x.id === gid);
    if (!g) return null;
    const members = guildMembers
      .filter((m) => m.guildId === gid)
      .map((m) => ({
        user: getUserPublicProfile(users.find((u) => u.id === m.userId)),
        role: m.role,
        joinedAt: m.joinedAt,
      }));
    return { ...g, members };
  }).filter(Boolean);
  return res.json({ guilds: list });
});

// 互动道具列表
app.get('/api/social/items', (req, res) => {
  return res.json({ items: socialItems });
});

// 给好友发送互动道具
app.post('/api/social/items/send', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const { targetUserId, itemCode } = body;
  const targetId = Number(targetUserId || 0);
  if (!targetId || targetId === user.id) return res.status(400).json({ error: 'targetUserId 非法' });
  const target = users.find((u) => u.id === targetId);
  if (!target) return res.status(404).json({ error: '目标用户不存在' });
  if (!areFriends(user.id, targetId)) return res.status(400).json({ error: '只能给好友发送道具' });
  const item = socialItems.find((x) => x.code === itemCode);
  if (!item) return res.status(400).json({ error: '道具不存在' });

  // 简化：暂不扣金币，仅应用效果
  const attrs = target.attributes;
  const deltas = {};
  for (const [k, v] of Object.entries(item.effects || {})) {
    const before = attrs[k] != null ? attrs[k] : 60;
    const after = clampAttr(before + v);
    attrs[k] = after;
    deltas[k] = after - before;
  }

  // 写一条通知
  const content =
    item.code === 'energy_bottle'
      ? `${user.username} 给你送来了一瓶精力瓶，精力 +${item.effects.fire || 0}`
      : `${user.username} 给你送来了道具「${item.name}」`;
  pushNotification(
    target.id,
    'social_item',
    '收到好友的关怀',
    content,
    '/home',
  );

  return res.json({
    success: true,
    item: { code: item.code, name: item.name },
    target: { id: target.id, username: target.username, attributes: target.attributes },
  });
});

// 排行榜：返回用户在某一维度的百分位分段，而非具体名次
app.get('/api/leaderboard/percentile', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const dimension = req.query.dimension || 'weekly_tasks';

  // 周期：最近 7 天
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 当前 MVP：用「最近 7 天已完成任务数」作为练习维度
  function weeklyTasksDone(u) {
    return tasks.filter(
      (t) =>
        t.userId === u.id &&
        t.status === 'completed' &&
        t.completedAt &&
        new Date(t.completedAt) >= since,
    ).length;
  }

  let valueFn;
  if (dimension === 'weekly_tasks') {
    valueFn = weeklyTasksDone;
  } else {
    // 其它维度暂未实现，回退到 weekly_tasks
    valueFn = weeklyTasksDone;
  }

  const rows = users.map((u) => ({
    userId: u.id,
    value: valueFn(u),
  }));

  if (!rows.length) return res.json({ dimension, value: 0, percentile: 0, tier: '无数据' });

  rows.sort((a, b) => a.value - b.value);
  const myValue = valueFn(user);
  const rankIndex = rows.findIndex((r) => r.userId === user.id);
  const percentile =
    rankIndex === -1 ? 0 : Math.round(((rankIndex + 1) / rows.length) * 100);

  let tier = '新手营';
  if (percentile >= 80) tier = '黄金先锋';
  else if (percentile >= 60) tier = '稳健进阶';
  else if (percentile >= 40) tier = '起步同行';

  const pref = getOrCreateLeaderboardPref(user.id);
  if (pref.hideRanking) {
    return res.json({ dimension, hidden: true });
  }

  return res.json({
    dimension,
    value: myValue,
    percentile,
    tier,
  });
});

// 排行榜隐私开关
app.post('/api/leaderboard/preferences', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const pref = getOrCreateLeaderboardPref(user.id);
  if (typeof body.hideRanking === 'boolean') {
    pref.hideRanking = body.hideRanking;
  }
  return res.json({ success: true, preferences: pref });
});

// ======== 里程碑 12：防流失机制辅助接口（免战牌 & 战略重组）========

// 免战牌：在一段时间内暂停 Boss 衰减
app.post('/api/world/shield', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const days = Math.max(1, Math.min(30, Number(body.days || 7)));
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  user.shield_until = until.toISOString();
  const msg = `未来 ${days} 天内，主战场将不会被拖延怪侵蚀。`;
  pushNotification(
    user.id,
    'shield',
    '已启用免战牌',
    msg,
    '/home',
  );
  logWorldEvent(
    user.id,
    'shield',
    '你打出了免战牌',
    msg,
    { days },
  );
  return res.json({ success: true, shield_until: user.shield_until });
});

// 战略重组：一键下调当前任务强度，帮助回归玩家重新上路
app.post('/api/world/regroup', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const myTasks = tasks.filter((t) => t.userId === user.id && t.status === 'pending');
  if (!myTasks.length) {
    return res.json({ success: true, adjustedTasks: 0 });
  }
  let adjusted = 0;
  myTasks.forEach((t) => {
    const oldXp = t.xpReward || 0;
    const oldCoins = t.coinsReward || 0;
    const oldAp = t.apValue || 0;
    const newXp = Math.max(5, Math.round(oldXp * 0.6));
    const newCoins = Math.max(1, Math.round(oldCoins * 0.7));
    const newAp = Math.max(1, Math.round(oldAp * 0.5));
    if (newXp !== oldXp || newCoins !== oldCoins || newAp !== oldAp) {
      t.xpReward = newXp;
      t.coinsReward = newCoins;
      t.apValue = newAp;
      adjusted += 1;
    }
  });
  pushNotification(
    user.id,
    'regroup',
    '已为你进行战略重组',
    '当前未完成的任务已整体下调难度与频率，可以用更轻的步伐重新出发。',
    '/tasks',
  );
  logWorldEvent(
    user.id,
    'regroup',
    '你调整了战场节奏',
    '系统已为你下调当前任务强度，帮助你重新站稳脚跟。',
    { adjustedTasks: adjusted },
  );
  return res.json({ success: true, adjustedTasks: adjusted });
});

// 世界动态事件流：查询用户的世界事件历史
app.get('/api/world/events', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const sinceDays = req.query.sinceDays ? Number(req.query.sinceDays) : null;
  let list = worldEvents.filter((e) => e.userId === user.id);
  if (sinceDays && sinceDays > 0) {
    const now = Date.now();
    const since = now - sinceDays * 24 * 60 * 60 * 1000;
    list = list.filter((e) => new Date(e.createdAt).getTime() >= since);
  }
  list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  return res.json({ events: list });
});

// 世界状态概览：返回当前 Boss 衰减状态、免战牌状态、最近事件摘要
app.get('/api/world/overview', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const now = Date.now();
  const shieldUntil = user.shield_until ? new Date(user.shield_until).getTime() : null;
  const hasShield = shieldUntil && shieldUntil > now;
  const shieldRemainingDays = hasShield ? Math.ceil((shieldUntil - now) / (24 * 60 * 60 * 1000)) : 0;
  const myBosses = bosses.filter((b) => b.userId === user.id && b.status === '进行中');
  const bossStatus = myBosses.map((b) => ({
    id: b.id,
    title: b.title,
    controlPercent: typeof b.controlPercent === 'number' ? b.controlPercent : 100,
  }));
  const recentEvents = worldEvents
    .filter((e) => e.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const lastLogin = user.last_login_at ? new Date(user.last_login_at).getTime() : null;
  const daysSinceLogin = lastLogin ? Math.floor((now - lastLogin) / (24 * 60 * 60 * 1000)) : 0;
  return res.json({
    shield: {
      active: hasShield,
      remainingDays: shieldRemainingDays,
      until: user.shield_until,
    },
    bosses: bossStatus,
    recentEvents: recentEvents.map((e) => ({
      type: e.type,
      title: e.title,
      message: e.message,
      createdAt: e.createdAt,
    })),
    daysSinceLogin,
  });
});

// ======== 里程碑 12：年度数据回顾报告 ========

function buildAnnualReport(user, year) {
  const y = Number(year);
  if (!y || y < 2000 || y > 3000) return { error: 'year 参数不合法' };

  const yearPrefix = String(y) + '-';
  const inYear = (iso) => typeof iso === 'string' && iso.startsWith(yearPrefix);

  // 五行属性：起点视为 60，中点为当前属性
  const attrs = user.attributes || {};
  const baseline = { wood: 60, fire: 60, earth: 60, metal: 60, water: 60 };
  const current = {
    wood: attrs.wood != null ? attrs.wood : 60,
    fire: attrs.fire != null ? attrs.fire : 60,
    earth: attrs.earth != null ? attrs.earth : 60,
    metal: attrs.metal != null ? attrs.metal : 60,
    water: attrs.water != null ? attrs.water : 60,
  };

  // Boss 时间轴
  const bossTimeline = bosses
    .filter((b) => b.userId === user.id && inYear(b.createdAt))
    .map((b) => ({
      id: b.id,
      title: b.title,
      createdAt: b.createdAt,
      status: b.status || '进行中',
      controlPercent: typeof b.controlPercent === 'number' ? b.controlPercent : 100,
    }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // 技能树概览
  const skillTree = skills
    .filter((s) => s.userId === user.id)
    .map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level || 1,
      primaryAttribute: s.primaryAttribute || null,
      secondaryAttribute: s.secondaryAttribute || null,
      createdAt: s.createdAt || null,
    }));

  // 消费花瓣图：按分类聚合全年支出和收入
  const yearTx = transactions.filter(
    (t) => t.userId === user.id && t.at && String(t.at).startsWith(yearPrefix),
  );
  const categoryMap = {};
  yearTx.forEach((tx) => {
    const cat = tx.category || (tx.type === 'income' ? '收入' : '支出');
    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, income: 0, expense: 0 };
    }
    if (tx.type === 'income') categoryMap[cat].income += tx.amount || 0;
    if (tx.type === 'expense') categoryMap[cat].expense += tx.amount || 0;
  });
  const financePetals = Object.values(categoryMap);

  // 高频复盘关键词云
  const collectTextFromRetrospects = () => {
    const list1 = retrospects.filter(
      (r) => r.userId === user.id && inYear(r.createdAt),
    );
    const text1 = list1
      .map((r) =>
        (r.answers || [])
          .map((a) => (typeof a.answer === 'string' ? a.answer : ''))
          .join(' '),
      )
      .join(' ');
    const list2 = retrospectsV2.filter(
      (r) => r.userId === user.id && inYear(r.createdAt),
    );
    const collectText = (r) => {
      if (r.contentType === 'free_text') return r.freeContent || '';
      const qa = r.qaData || {};
      if (Array.isArray(qa.blocks) && qa.blocks.length) {
        return qa.blocks
          .map((b) => {
            if (!b) return '';
            if (b.type === 'question') return typeof b.answer === 'string' ? b.answer : '';
            if (b.type === 'free') return b.content || '';
            return '';
          })
          .join(' ');
      }
      const qText = (qa.questions || [])
        .map((q) => (typeof q.answer === 'string' ? q.answer : ''))
        .join(' ');
      const free = (qa.free_sections || [])
        .map((s) => (s && s.content) || '')
        .join(' ');
      return qText + ' ' + free;
    };
    const text2 = list2.map(collectText).join(' ');
    return (text1 + ' ' + text2).trim();
  };

  const allText = collectTextFromRetrospects();
  const freq = {};
  if (allText) {
    const words = allText
      .split(/[\s，。、“”‘’；;,.!？?\n\r]/)
      .filter(Boolean);
    words.forEach((w) => {
      if (w.length <= 1) return;
      freq[w] = (freq[w] || 0) + 1;
    });
  }
  const keywordCloud = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // 任务与娱乐 / 作息等整体统计，用于故事文案
  const yearTasks = tasks.filter(
    (t) =>
      t.userId === user.id &&
      t.completedAt &&
      String(t.completedAt).startsWith(yearPrefix),
  );
  const completedTasks = yearTasks.length;
  const yearEnt = entertainmentLogs.filter(
    (l) => l.userId === user.id && l.at && String(l.at).startsWith(yearPrefix),
  );
  const entertainmentMinutes = yearEnt.reduce(
    (sum, l) => sum + (Number(l.duration || 0) || 0),
    0,
  );
  const yearScheduleLogs = scheduleLogs.filter(
    (l) => l.userId === user.id && l.at && String(l.at).startsWith(yearPrefix),
  );

  return {
    year: y,
    user: { id: user.id, username: user.username },
    fiveElements: {
      baseline,
      current,
    },
    bosses: bossTimeline,
    skills: skillTree,
    finance: {
      categories: financePetals,
    },
    retrospects: {
      keywordCloud,
      hasData: !!allText,
    },
    summaryStats: {
      completedTasks,
      entertainmentMinutes,
      scheduleLogs: yearScheduleLogs.length,
    },
  };
}

app.get('/api/reports/annual', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const year = req.query.year || new Date().getFullYear();
  const report = buildAnnualReport(user, year);
  if (report && report.error) {
    return res.status(400).json({ error: report.error });
  }
  return res.json({ report });
});

// 基于年度报告生成一段简短的“成长年鉴”文字稿，方便前端直接展示或嵌入长图
function buildAnnualStory(report) {
  const year = report.year;
  const name = report.user.username || '这位玩家';
  const stats = report.summaryStats || {};
  const five = report.fiveElements || {};
  const bosses = Array.isArray(report.bosses) ? report.bosses : [];
  const skills = Array.isArray(report.skills) ? report.skills : [];
  const financeCats =
    (report.finance && Array.isArray(report.finance.categories) && report.finance.categories) ||
    [];
  const cloud = (report.retrospects && report.retrospects.keywordCloud) || [];

  const attrs = five.current || {};
  const avgAttr =
    (['wood', 'fire', 'earth', 'metal', 'water'].reduce(
      (sum, k) => sum + (typeof attrs[k] === 'number' ? attrs[k] : 60),
      0,
    ) / 5) | 0;

  const topKeyword =
    cloud && cloud.length
      ? cloud[0].word
      : null;

  const totalExpense = financeCats.reduce(
    (sum, c) => sum + (Number(c.expense || 0) || 0),
    0,
  );

  const bossTitles = bosses.map((b) => b.title).filter(Boolean);
  const mainBossLine =
    bossTitles.length === 0
      ? '这一年你还在为未来的 Boss 热身。'
      : `你先后迎战了 ${bossTitles.length} 个 Boss，其中包括「${bossTitles[0]}」${bossTitles[1] ? ` 等关键战役` : ''}。`;

  const skillNames = skills.map((s) => s.name).filter(Boolean);
  const skillLine =
    skillNames.length === 0
      ? '技能树还在萌芽阶段，但你已经在为下一轮升级积蓄力量。'
      : `你的技能树上已经点亮了 ${skillNames.length} 个节点，代表作包括：${skillNames
          .slice(0, 3)
          .join('、')}。`;

  const keywordLine = topKeyword
    ? `在所有复盘中，最常出现的关键词是「${topKeyword}」，它大概就是这一年的底色。`
    : '你还没有留下太多复盘文字，但每一次行动本身，已经在替你书写故事。';

  const financeLine =
    totalExpense > 0
      ? `这一年你在「自我奖励」上的总投入约为 ¥${Math.round(totalExpense)}，每一笔花费都在为当下的你和未来的你买单。`
      : '这一年你的财务记录还很干净，未来可以尝试用小额的「自我奖励」来庆祝每一次进步。';

  const taskCount = stats.completedTasks || 0;
  const entMinutes = stats.entertainmentMinutes || 0;
  const scheduleCount = stats.scheduleLogs || 0;

  const lines = [
    `【${year} · ${name}的修炼年鉴】`,
    '',
    `这一年，你一共完成了约 ${taskCount} 个任务，平均下来差不多每几天就打通一个小关卡。`,
    `在作息与状态记录上，你留下了 ${scheduleCount} 条足迹；在放松和娱乐上，你给自己安排了约 ${entMinutes} 分钟的喘息时间。`,
    '',
    mainBossLine,
    skillLine,
    '',
    `五行平均状态大约在 ${avgAttr} 分左右：这既是现实的坐标，也是下一轮升级的起点。`,
    keywordLine,
    financeLine,
  ];

  return lines.join('\n');
}

app.get('/api/reports/annual/story', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const year = req.query.year || new Date().getFullYear();
  const report = buildAnnualReport(user, year);
  if (report && report.error) {
    return res.status(400).json({ error: report.error });
  }
  const story = buildAnnualStory(report);
  return res.json({ report, story });
});

// 获取用户有数据的可用年份列表（用于年度报告选择器）
app.get('/api/reports/annual/years', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const yearSet = new Set();
  const now = new Date();
  const currentYear = now.getFullYear();
  yearSet.add(currentYear);
  const userCreatedAt = user.created_at ? new Date(user.created_at).getFullYear() : currentYear;
  yearSet.add(userCreatedAt);
  [...bosses, ...tasks, ...transactions, ...retrospects, ...retrospectsV2, ...entertainmentLogs, ...scheduleLogs]
    .filter((item) => item.userId === user.id && item.createdAt)
    .forEach((item) => {
      try {
        const y = new Date(item.createdAt).getFullYear();
        if (y >= 2000 && y <= 3000) yearSet.add(y);
      } catch (e) {}
    });
  const years = Array.from(yearSet).sort((a, b) => b - a);
  return res.json({ years });
});

// ======== 里程碑 3：任务 CRUD ========

app.get('/api/tasks', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  let list = tasks.filter((t) => t.userId === user.id && t.status !== 'deleted');
  const typeFilter = req.query.type;
  if (typeFilter) list = list.filter((t) => t.type === typeFilter);
  return res.json({ tasks: list });
});

app.post('/api/tasks', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const body = req.body || {};
  const title = (body.title || '').trim();
  if (!title) return res.status(400).json({ error: '任务标题不能为空' });
  const task = {
    id: nextTaskId++,
    userId: user.id,
    title,
    type: body.type || 'daily',
    status: 'pending',
    xpReward: typeof body.xpReward === 'number' ? body.xpReward : 10,
    coinsReward: typeof body.coinsReward === 'number' ? body.coinsReward : 5,
    apValue: typeof body.apValue === 'number' ? body.apValue : 2,
    attributeEffects: body.attributeEffects && typeof body.attributeEffects === 'object' ? body.attributeEffects : {},
    skillXp: Array.isArray(body.skillXp) ? body.skillXp : [],
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.push(task);
  return res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const task = tasks.find((t) => t.id === id && t.userId === user.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (task.status !== 'pending') return res.status(400).json({ error: '只能修改未完成的任务' });
  const body = req.body || {};
  if (body.title !== undefined) task.title = String(body.title).trim();
  if (body.type !== undefined) task.type = body.type;
  if (body.xpReward !== undefined) task.xpReward = body.xpReward;
  if (body.coinsReward !== undefined) task.coinsReward = body.coinsReward;
  if (body.attributeEffects !== undefined) task.attributeEffects = body.attributeEffects;
  return res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const task = tasks.find((t) => t.id === id && t.userId === user.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  task.status = 'deleted';
  return res.json({ success: true });
});

// 完成任务：应用经验/金币/属性/技能经验/成就，返回反馈数据（含生克解释）
app.post('/api/tasks/:id/complete', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });
  const id = parseInt(req.params.id, 10);
  const task = tasks.find((t) => t.id === id && t.userId === user.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  if (task.status === 'completed') return res.status(400).json({ error: '任务已完成' });
  if (task.status === 'deleted') return res.status(400).json({ error: '任务已删除' });

  const rewards = { xp: 0, coins: 0, ap: 0, attributes: {}, elementInteractions: [], skillUps: [], achievements: [] };
  const attrDeltas = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  // 经验
  const xp = typeof task.xpReward === 'number' ? task.xpReward : 0;
  user.total_xp = (user.total_xp || 0) + xp;
  rewards.xp = xp;
  // 等级提升：当前逻辑为 total_xp 表示本等级内经验，满 level*100 升级
  while (user.total_xp >= user.level * 100) {
    user.total_xp -= user.level * 100;
    user.level += 1;
  }

  // 金币
  const coins = typeof task.coinsReward === 'number' ? task.coinsReward : 0;
  user.coins = (user.coins || 0) + coins;
  rewards.coins = coins;

  // AP（仅记录到反馈，如需扣减可在此处理）
  rewards.ap = typeof task.apValue === 'number' ? task.apValue : 0;

  // 五行属性（先应用任务直接效果，再跑生克引擎）
  const effects = task.attributeEffects || {};
  for (const key of ['wood', 'fire', 'earth', 'metal', 'water']) {
    const delta = effects[key] || 0;
    const before = user.attributes[key] != null ? user.attributes[key] : 60;
    const after = clampAttr(before + delta);
    user.attributes[key] = after;
    attrDeltas[key] = after - before;
  }
  const interactionMessages = applyElementInteractions(user.attributes, attrDeltas);
  rewards.elementInteractions = interactionMessages;
  rewards.attributes = attrDeltas;

  // 技能经验与升级
  const skillXpList = task.skillXp || [];
  for (const { skillId, xp: sx } of skillXpList) {
    const skill = skills.find((s) => s.id === skillId && s.userId === user.id);
    if (!skill) continue;
    const xpPerLevel = 50; // 每级所需经验
    const need = skill.level * xpPerLevel;
    skill.xp = (skill.xp || 0) + sx;
    if (skill.xp >= need) {
      skill.xp -= need;
      skill.level += 1;
      rewards.skillUps.push({ skillId: skill.id, skillName: skill.name, newLevel: skill.level });
    }
  }

  // 成就检查
  const completedCount = tasks.filter((t) => t.userId === user.id && t.status === 'completed').length;
  const afterCompleteCount = completedCount + 1;
  const toCheck = [
    { code: 'first_task', condition: () => afterCompleteCount >= 1 },
    { code: 'task_5', condition: () => afterCompleteCount >= 5 },
    { code: 'task_10', condition: () => afterCompleteCount >= 10 },
  ];
  for (const { code, condition } of toCheck) {
    if (!condition()) continue;
    const ach = achievements.find((a) => a.code === code);
    if (!ach) continue;
    const already = userAchievements.some((ua) => ua.userId === user.id && ua.achievementId === ach.id);
    if (!already) {
      userAchievements.push({
        id: nextUserAchievementId++,
        userId: user.id,
        achievementId: ach.id,
        unlockedAt: new Date().toISOString(),
      });
      rewards.achievements.push({ code: ach.code, name: ach.name, description: ach.description });
    }
  }
  if (rewards.skillUps.length > 0) {
    const ach = achievements.find((a) => a.code === 'skill_up');
    if (ach) {
      const already = userAchievements.some((ua) => ua.userId === user.id && ua.achievementId === ach.id);
      if (!already) {
        userAchievements.push({
          id: nextUserAchievementId++,
          userId: user.id,
          achievementId: ach.id,
          unlockedAt: new Date().toISOString(),
        });
        rewards.achievements.push({ code: ach.code, name: ach.name, description: ach.description });
      }
    }
  }

  task.status = 'completed';
  task.completedAt = new Date().toISOString();

  // 写入一条站内通知：任务完成
  let summary = `你完成了任务「${task.title}」`;
  if (rewards.coins || rewards.xp) {
    const parts = [];
    if (rewards.coins) parts.push(`金币 +${rewards.coins}`);
    if (rewards.xp) parts.push(`经验 +${rewards.xp}`);
    summary += `（${parts.join('，')}）`;
  }
  pushNotification(
    user.id,
    'task_complete',
    '任务完成',
    summary,
    `/tasks/${task.id}`,
  );

  return res.json({
    success: true,
    task: { id: task.id, title: task.title, status: task.status, completedAt: task.completedAt },
    rewards,
    user: {
      id: user.id,
      username: user.username,
      level: user.level,
      total_xp: user.total_xp,
      coins: user.coins,
      cash_balance: user.cash_balance,
      attributes: user.attributes,
    },
  });
});

// ======== 里程碑 10：主页聚合 API（游戏大厅）+ 小型智能推荐演示 ========

// 主页聚合：返回等级、金币、五行、今日任务/财务/娱乐、励志摘要与系统推荐
app.get('/api/home/dashboard', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: '未授权或令牌无效' });

  const decayInfo = applyBossInactivityDecay(user) || null;

  // 用户与属性
  const userSummary = {
    level: user.level || 1,
    coins: user.coins || 0,
  };

  const attributesSummary = {
    wood: user.attributes?.wood ?? 60,
    fire: user.attributes?.fire ?? 60,
    earth: user.attributes?.earth ?? 60,
    metal: user.attributes?.metal ?? 60,
    water: user.attributes?.water ?? 60,
  };

  // 日期辅助
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const isSameDay = (iso) => {
    if (!iso) return false;
    return String(iso).slice(0, 10) === todayKey;
  };

  // 今日任务概览（简单按创建/完成日期统计）
  const userTasks = tasks.filter((t) => t.userId === user.id && t.status !== 'deleted');
  const mainTaskCompleted = userTasks.filter(
    (t) => t.status === 'completed' && isSameDay(t.completedAt),
  ).length;
  const mainTaskTotal = userTasks.filter((t) => isSameDay(t.createdAt)).length || mainTaskCompleted;

  // 今日是否有娱乐记录
  const userEntertainment = entertainmentLogs.filter(
    (log) => log.userId === user.id && isSameDay(log.at),
  );
  const entertainmentCompleted = userEntertainment.length > 0;

  // 今日财务（按当天支出统计）
  const userTransactions = transactions.filter(
    (tx) => tx.userId === user.id && tx.type === 'expense' && isSameDay(tx.at),
  );
  const spentToday = userTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const month = monthKey(today);
  const userBudget = budgets.find((b) => b.userId === user.id && b.month === month);
  const dailyBudget = userBudget?.rewardLimitRmb ?? 200;

  const todayOverview = {
    mainTaskCompleted,
    mainTaskTotal,
    entertainmentCompleted,
    budgetStatus: {
      spent: spentToday,
      dailyBudget,
    },
  };

  // 战略聚焦：活跃 Boss / 任务
  const activeBosses = bosses.filter((b) => b.userId === user.id && b.status !== 'archived');
  const recentTask = userTasks
    .filter((t) => t.status !== 'deleted')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

  const strategySnapshot = {
    activeGoals: activeBosses.length,
    recentTask: recentTask
      ? {
          id: recentTask.id,
          title: recentTask.title,
          dueSoon: false, // TODO：后续接入截止时间
        }
      : null,
  };

  // 励志摘要：先用固定句子，后续可接励志墙模块
  const motivationGlimpse = {
    trendingSentence: '所谓成长，就是不断把昨天的 Boss 变成今天的经验包。',
    newComments: 0,
  };

  // 系统推荐：基于属性 / 娱乐 / 复盘 / 财务的轻量规则演示
  const avgAttr =
    (attributesSummary.wood +
      attributesSummary.fire +
      attributesSummary.earth +
      attributesSummary.metal +
      attributesSummary.water) /
    5;

  const systemSuggestions = [];
  // 精力偏低 → 推荐补给包
  if (avgAttr < 65) {
    systemSuggestions.push({
      type: 'supply',
      reason: '您今日精力消耗较大',
      item: '精力饮料',
    });
  }
  // 今日无娱乐 → 推荐一小段放松
  if (!entertainmentCompleted) {
    systemSuggestions.push({
      type: 'entertainment',
      reason: '今天还没有安排娱乐，可以适当放松一下',
      link: '/entertainment',
    });
  }

  // 健康提升提示：木属性较年初（60）高出明显
  const healthGain = attributesSummary.wood - 60;
  if (healthGain >= 10) {
    systemSuggestions.push({
      type: 'insight',
      reason: '根据你最近的作息与打卡，健康值有了明显提升',
      message: `与你刚入坑时相比，你的「木·健康」大约提升了 ${healthGain} 点，保持这个节奏，很快就能解锁更多高强度挑战。`,
    });
  }

  // 复盘联动：最近复盘出现“累/疲惫/困/压力/焦虑”等词 → 推荐补给包 + 励志墙
  const tiredKeywords = ['累', '疲惫', '困', '压力', '焦虑'];
  const latestRetrospectText = (() => {
    // 优先使用 v2 复盘
    const listV2 = retrospectsV2
      .filter((r) => r.userId === user.id)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (listV2[0]) {
      const r = listV2[0];
      if (r.contentType === 'free_text') return r.freeContent || '';
      const qa = r.qaData || {};
      if (Array.isArray(qa.blocks) && qa.blocks.length) {
        return qa.blocks
          .map((b) => {
            if (!b) return '';
            if (b.type === 'question') return typeof b.answer === 'string' ? b.answer : '';
            if (b.type === 'free') return b.content || '';
            return '';
          })
          .join(' ');
      }
      const qText = (qa.questions || []).map((q) => (typeof q.answer === 'string' ? q.answer : '')).join(' ');
      const free = (qa.free_sections || []).map((s) => (s && s.content) || '').join(' ');
      return qText + ' ' + free;
    }
    // 回退到老版模板化复盘
    const list = retrospects
      .filter((r) => r.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!list[0]) return '';
    return (list[0].answers || [])
      .map((a) => (typeof a.answer === 'string' ? a.answer : ''))
      .join(' ');
  })();

  if (latestRetrospectText) {
    const text = String(latestRetrospectText);
    if (tiredKeywords.some((k) => text.includes(k))) {
      systemSuggestions.push({
        type: 'review_linked_supply',
        reason: '最近复盘中提到疲惫，推荐安排一点恢复补给',
        item: '静心茶',
        link: '/inventory?scenario=relax',
      });
      systemSuggestions.push({
        type: 'review_linked_inspiration',
        reason: '复盘中提到压力，可以看看关于休息的励志句子',
        link: '/motivation?tag=rest',
      });
    }
    // 拖延关键词：推荐战胜拖延资源包
    if (text.includes('拖延')) {
      systemSuggestions.push({
        type: 'content_bundle',
        reason: '最近复盘中多次提到「拖延」，推荐一组战胜拖延的资源与励志文集',
        link: '/motivation?tag=anti_procrastination',
      });
    }
  }

  // 财务联动：本月「餐饮」支出偏高 → 推荐支线任务模板
  const monthTransactions = transactions.filter(
    (tx) => tx.userId === user.id && tx.type === 'expense' && monthKey(tx.at) === month,
  );
  const foodSpent = monthTransactions
    .filter((tx) => tx.category === '餐饮')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const foodBudget = (userBudget?.rewardLimitRmb ?? 300) * 0.5; // 约一半预算用于餐饮
  if (foodSpent > foodBudget) {
    systemSuggestions.push({
      type: 'side_quest',
      reason: '本月餐饮支出偏高，试试用支线任务帮自己控一下',
      item: '支线任务：自制晚餐 3 次',
      link: '/tasks/templates?code=home_cook_3',
    });
  }

  return res.json({
    user: userSummary,
    attributes: attributesSummary,
    todayOverview,
    strategySnapshot,
    motivationGlimpse,
    systemSuggestions,
    worldState: { bossDecay: decayInfo },
  });
});

// 小「智能推荐」演示：根据心情值 + 时间给出不同建议
app.get('/api/recommend/demo', (req, res) => {
  const user = getUserFromToken(req.headers.authorization);
  // 心情：如果有用户，用五行平均值估算；也允许 query.mood 覆盖
  let baseMood = 60;
  if (user && user.attributes) {
    const attrs = user.attributes;
    baseMood =
      ((attrs.wood ?? 60) +
        (attrs.fire ?? 60) +
        (attrs.earth ?? 60) +
        (attrs.metal ?? 60) +
        (attrs.water ?? 60)) /
      5;
  }

  const mood = Number(req.query.mood ?? baseMood);
  const time = req.query.time || new Date().toTimeString().slice(0, 5); // HH:MM

  let suggestion;

  if (mood < 40 && time >= '20:00') {
    // 情景融合：心情低 + 晚上 → 娱乐 + 励志
    suggestion = {
      type: 'entertainment',
      title: '今晚先放松一下',
      content: '检测到你今天有点累，先来一局轻松的娱乐，再看一眼励志墙吧。',
      actions: [
        { label: '去娱乐一下', link: '/entertainment' },
        { label: '看看暖心句子', link: '/motivation' },
      ],
    };
  } else if (mood >= 70) {
    // 心情不错 → 推进主线
    suggestion = {
      type: 'mainQuest',
      title: '状态正好，冲一波主线',
      content: '你现在状态不错，很适合推进一个重要任务。',
      actions: [
        { label: '打开战略沙盘', link: '/strategy' },
        { label: '查看今日主线任务', link: '/tasks' },
      ],
    };
  } else {
    // 中性状态 → 小补给
    suggestion = {
      type: 'supply',
      title: '来一份小补给',
      content: '可以安排一个小补给，让接下来的节奏更稳。',
      actions: [{ label: '使用 静心茶', link: '/inventory?item=tea' }],
    };
  }

  return res.json({
    mood,
    time,
    suggestion,
  });
});

// 在本地或普通服务器环境下启动监听；
// 在 Vercel 等无服务器环境中仅导出 app，由 Serverless 封装处理。
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`人生玩家 backend running on http://0.0.0.0:${PORT}`);
    console.log(`本地访问: http://localhost:${PORT}`);
    console.log(`局域网访问: http://<your-ip>:${PORT}`);
    console.log(`公网访问: 请确保服务器有公网 IP 或使用内网穿透服务`);
  });
}

module.exports = app;
