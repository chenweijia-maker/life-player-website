const { get, post } = require("../../utils/request");

function safeNum(v, fallback = 0) {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

Page({
  data: {
    loading: false,

    // 顶部
    userName: "玩家",
    userInitial: "玩",
    level: 1,
    expPercent: 0,
    cash: "0.00",
    coins: 0,

    // 左列
    attrList: [
      { key: "wood", name: "木·健康", icon: "🌳", color: "#16a34a", value: 60 },
      { key: "fire", name: "火·精力", icon: "🔥", color: "#f97316", value: 60 },
      { key: "earth", name: "土·智慧", icon: "🏔️", color: "#eab308", value: 60 },
      { key: "metal", name: "金·财富", icon: "⭐", color: "#facc15", value: 60 },
      { key: "water", name: "水·心情", icon: "💧", color: "#0ea5e9", value: 60 },
    ],

    // 中列
    currentBoss: null,
    mainTasks: [],
    dailyTasks: [],

    // 右列
    friendFeed: [],
    friendFeedLoading: false,
    friendFeedError: "",

    // 预留：通知
    notifications: [],

    // 雷达图导出为图片的地址，用 image 显示以便随框滚动
    radarImageUrl: "",

    // 设定人生水晶 & Boss 表单
    crystalForm: {
      lifeCrystal: "",
      bossTitle: "",
      challengeTitle: "",
      challengeSkills: "",
    },
  },

  onShow() {
    this.ensureLoggedInAndLoad();
  },

  onReady() {
    this.drawRadarWhenReady();
  },

  drawRadarWhenReady() {
    const list = this.data.attrList;
    if (!list || list.length < 5) return;
    const query = wx.createSelectorQuery().in(this);
    query
      .select("#radarCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext("2d");
        const w = 280;
        const h = 280;
        let dpr = 2;
        try {
          const win = wx.getWindowInfo && wx.getWindowInfo();
          if (win && win.pixelRatio) dpr = win.pixelRatio;
        } catch (e) {}
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        this.drawRadar(ctx, w, h, list);
        const that = this;
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            x: 0,
            y: 0,
            width: w,
            height: h,
            destWidth: w,
            destHeight: h,
            fileType: "png",
            success(res) {
              that.setData({ radarImageUrl: res.tempFilePath });
            },
          });
        }, 80);
      });
  },

  drawRadar(ctx, w, h, list) {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 * 0.52;
    const count = 5;
    const values = list.slice(0, count).map((it) => clamp(it.value, 0, 100) / 100);

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const x = cx + R * Math.cos(angle);
      const y = cy + R * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    for (let r = 0.25; r <= 1; r += 0.25) {
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const x = cx + R * r * Math.cos(angle);
        const y = cy + R * r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const j = i % count;
      const angle = (Math.PI * 2 * j) / count - Math.PI / 2;
      const r = R * (values[j] || 0);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(102, 126, 234, 0.35)";
    ctx.fill();
    ctx.strokeStyle = "rgba(102, 126, 234, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 五个顶点标注属性名，留足边距避免被裁切
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const labelR = R + 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      const tx = cx + labelR * Math.cos(angle);
      const ty = cy + labelR * Math.sin(angle);
      const name = (list[i] && list[i].name) ? list[i].name : "";
      if (name) ctx.fillText(name, tx, ty);
    }
  },

  ensureLoggedInAndLoad() {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.loadAll();
  },

  async loadAll() {
    this.setData({ loading: true });
    try {
      await Promise.all([this.fetchHome(), this.fetchNotifications(), this.fetchFriendFeed()]);
    } finally {
      this.setData({ loading: false });
    }
  },

  async fetchHome() {
    try {
      const res = await get("home");
      const data = (res && res.data) || {};
      if (data.error) {
        wx.showToast({ title: data.error, icon: "none" });
        return;
      }

      // 对齐 H5：home.user / home.attributes / home.dailyTasks / home.currentBoss || home.mainBoss
      const user = data.user || {};
      const attrs = data.attributes || {};
      const exp = data.experience || {};
      const rewards = data.rewardsSummary || data.rewards || {};

      const username = user.username || user.nickname || "玩家";
      const initial = (username && String(username)[0]) || "玩";

      const lvl = safeNum(user.level, 1);
      const percent = clamp(safeNum(exp.percent, 0), 0, 100);
      const cash = safeNum(user.cash_balance, 0);
      const coins = safeNum(rewards.coins, safeNum(user.coins, 0));

      const list = (this.data.attrList || []).map((it) => {
        const raw = safeNum(attrs[it.key], 60);
        return Object.assign({}, it, { value: clamp(raw, 0, 100) });
      });

      const boss = data.currentBoss || data.mainBoss || null;
      const mainTasks =
        data.challengesUnderCurrentBoss ||
        (boss ? (data.challenges || []).filter((c) => c.bossId === boss.id) : []) ||
        [];

      let dailyTasks = data.dailyTasks || [];
      if (dailyTasks.length === 0) {
        dailyTasks = [
          { id: "daily-1", title: "每日签到之道", status: "completed" },
          { id: "daily-2", title: "健身 30 分钟", status: "pending" },
          { id: "daily-3", title: "阅读 30 分钟", status: "pending" },
        ];
      }

      this.setData({
        userName: username,
        userInitial: initial,
        level: lvl,
        expPercent: percent,
        cash: cash.toFixed(2),
        coins,
        attrList: list,
        currentBoss: boss,
        mainTasks,
        dailyTasks,
      }, () => {
        this.drawRadarWhenReady();
      });
    } catch (e) {
      console.error(e);
      wx.showToast({ title: "无法加载主页数据", icon: "none" });
    }
  },

  async fetchNotifications() {
    try {
      const res = await get("notifications");
      const data = (res && res.data) || {};
      if (!data || data.error) return;
      this.setData({ notifications: data.notifications || [] });
    } catch (e) {}
  },

  async fetchFriendFeed() {
    this.setData({ friendFeedLoading: true, friendFeedError: "" });
    try {
      const res = await get("friends/feed");
      const data = (res && res.data) || {};
      const feed = Array.isArray(data.feed) ? data.feed : [];

      // 统一成 wxml 里用的字段：userName + text
      const mapped = feed.slice(0, 6).map((item) => {
        const u = item.user || {};
        return {
          id: item.id || String(Math.random()),
          userName: u.username || "好友",
          text: item.title ? `${item.title}${item.content ? " · " + item.content : ""}` : (item.content || ""),
        };
      });

      this.setData({ friendFeed: mapped });
    } catch (e) {
      console.error(e);
      this.setData({ friendFeedError: "无法加载好友动态，请稍后再试" });
    } finally {
      this.setData({ friendFeedLoading: false });
    }
  },

  async onCompleteDaily(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    try {
      const res = await post("tasks/" + id + "/complete");
      const data = (res && res.data) || {};
      if (!data.success) {
        wx.showToast({ title: data.error || "完成失败", icon: "none" });
        return;
      }
      wx.showToast({ title: "完成 +奖励", icon: "success" });
      await this.fetchHome();
      await this.fetchNotifications();
      await this.fetchFriendFeed();
    } catch (e2) {
      console.error(e2);
      wx.showToast({ title: "请求失败，请检查后端", icon: "none" });
    }
  },

  async onTapMainTask(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    try {
      const res = await get("challenges/" + id + "/detail");
      const data = (res && res.data) || {};
      if (data.error) {
        wx.showToast({ title: data.error, icon: "none" });
        return;
      }
      // 先用弹窗展示，后续你要更完整的详情页我再拆 page
      const title = data.challenge && data.challenge.title ? data.challenge.title : "挑战详情";
      wx.showModal({
        title,
        content: "已从后端拉到挑战详情（示例展示）。",
        showCancel: false,
      });
    } catch (e2) {
      console.error(e2);
      wx.showToast({ title: "加载挑战详情失败", icon: "none" });
    }
  },

  onCrystalInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    if (!field) return;
    this.setData({
      ["crystalForm." + field]: value,
    });
  },

  async onSaveCrystal() {
    const { lifeCrystal, bossTitle, challengeTitle, challengeSkills } = this.data.crystalForm || {};
    if (!lifeCrystal || !bossTitle || !challengeTitle) {
      wx.showToast({ title: "请先填写水晶、Boss 和挑战标题", icon: "none" });
      return;
    }
    const skillsText = (challengeSkills || "").trim();
    const coreSkills = skillsText
      ? skillsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      : [];
    try {
      const resV = await post("visions", { data: { content: lifeCrystal.trim() } });
      const v = (resV && resV.data) || {};
      if (v.error) {
        wx.showToast({ title: "保存人生水晶失败: " + (v.error || ""), icon: "none" });
        return;
      }
      const resB = await post("bosses", { data: { visionId: v.id, title: bossTitle.trim() } });
      const b = (resB && resB.data) || {};
      if (b.error) {
        wx.showToast({ title: "创建 Boss 失败: " + (b.error || ""), icon: "none" });
        return;
      }
      for (const name of coreSkills) {
        if (!name) continue;
        await post("skills", { data: { name } });
      }
      const skillLevelRequirements = {};
      coreSkills.forEach((n) => { skillLevelRequirements[n] = 1; });
      await post("challenges", {
        data: {
          bossId: b.id,
          title: challengeTitle.trim(),
          coreSkills,
          skillLevelRequirements,
        },
      });
      wx.showToast({ title: "已保存目标与挑战（M2）", icon: "success" });
      this.setData({
        "crystalForm.lifeCrystal": "",
        "crystalForm.bossTitle": "",
        "crystalForm.challengeTitle": "",
        "crystalForm.challengeSkills": "",
      });
      this.fetchHome();
    } catch (e) {
      console.error(e);
      wx.showToast({ title: "保存失败，请检查后端是否运行", icon: "none" });
    }
  },

  onNav(e) {
    const dataset = e && e.currentTarget && e.currentTarget.dataset;
    const view = dataset && dataset.view;
    const title = (dataset && dataset.title) || "功能";
    if (view === "settings") {
      wx.navigateTo({ url: "/pages/settings/settings" });
      return;
    }
    if (view === "schedule") {
      wx.navigateTo({ url: "/pages/schedule/schedule" });
      return;
    }
    if (view === "plan" || view === "finance" || view === "sideQuests" || view === "entertainment" || view === "retrospect" || view === "shop" || view === "motivation" || view === "social") {
      wx.navigateTo({
        url: "/pages/feature/feature?view=" + encodeURIComponent(view) + "&title=" + encodeURIComponent(title),
      });
      return;
    }
    wx.navigateTo({
      url: "/pages/placeholder/placeholder?view=" + encodeURIComponent(view || "") + "&title=" + encodeURIComponent(title),
    });
  },

  /** 阻止雷达图区域被拖动或触发滚动，使整块框和图不可移动 */
  preventMove() {},
});

