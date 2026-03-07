const { get, post } = require("../../utils/request");

Page({
  data: {
    title: "",
    view: "",
    loading: true,
    error: "",
    list: [],
    extra: null,
    // 各模块表单
    sideQuestTitle: "",
    entActivity: "",
    entDuration: "",
    financeTxType: "expense",
    financeTxAmount: "",
    financeTxNote: "",
    retroTitle: "",
    retroContent: "",
    friendId: "",
    motivationText: "",
    planVisionContent: "",
    planBossTitle: "",
    planChallengeTitle: "",
    planSkillName: "",
    wealthGoalTitle: "",
    wealthGoalAmount: "",
  },

  onLoad(options) {
    const title = (options && options.title) ? decodeURIComponent(options.title) : "功能";
    const view = (options && options.view) ? decodeURIComponent(options.view) : "";
    wx.setNavigationBarTitle({ title });
    this.setData({ title, view }, () => this.loadData());
  },

  async loadData() {
    const view = this.data.view;
    this.setData({ loading: true, error: "", list: [], extra: null });
    try {
      const unwrap = (res) => (res && res.data && res.data.data !== undefined ? res.data.data : (res && res.data) || {});

      switch (view) {
        case "schedule": {
          const res = await get("schedule/summary");
          const d = unwrap(res);
          const list = [];
          if (d.sleepHours != null) list.push({ title: "近7日平均睡眠", desc: d.sleepHours + " 小时" });
          if (d.logsCount != null) list.push({ title: "打卡次数", desc: d.logsCount + " 次" });
          this.setData({ list: list.length ? list : [{ title: "暂无作息数据", desc: "去首页或作息页打卡吧" }] });
          break;
        }
        case "plan": {
          const res = await get("plan/overview");
          const d = unwrap(res);
          const list = [];
          (d.visions || []).forEach((v) => list.push({ title: "人生水晶", desc: v.content }));
          (d.bosses || []).forEach((b) => list.push({ title: "Boss", desc: b.title }));
          (d.challenges || []).forEach((c) => list.push({ title: "挑战", desc: c.title }));
          (d.skills || []).forEach((s) => list.push({ title: "技能", desc: (s.name || "") + " Lv." + (s.level || 1) }));
          this.setData({ list: list.length ? list : [{ title: "暂无目标", desc: "在下方添加或首页设定" }], extra: d });
          break;
        }
        case "finance": {
          const res = await get("finance/overview");
          const d = unwrap(res);
          const list = [];
          if (d.coins != null) list.push({ title: "金币", desc: String(d.coins) });
          const balance = d.cash_balance != null ? d.cash_balance : d.balance;
          if (balance != null) list.push({ title: "余额", desc: "¥ " + Number(balance).toFixed(2) });
          const txList = d.transactions || d.recentTransactions || [];
          txList.slice(0, 50).forEach((t) => {
            const sign = t.type === "income" ? "+" : "-";
            const amt = Number(t.amount || 0).toFixed(2);
            const cat = t.category || "";
            const note = t.note ? " · " + t.note : "";
            list.push({ title: t.type === "income" ? "收入" : "支出", desc: sign + "¥" + amt + " " + cat + note });
          });
          const displayBalance = (d.cash_balance != null ? Number(d.cash_balance) : 0).toFixed(2);
          const displayTarget = (d.wealthGoal && d.wealthGoal.targetAmount != null ? Number(d.wealthGoal.targetAmount) : 0).toFixed(2);
          this.setData({
            list: list.length ? list : [],
            extra: { ...d, coins: d.coins, displayBalance, displayTarget },
            financeTxAmount: "",
            financeTxNote: "",
          });
          break;
        }
        case "sideQuests": {
          const res = await get("tasks");
          const d = unwrap(res);
          const tasks = Array.isArray(d.tasks) ? d.tasks : [];
          const list = tasks.filter((t) => (t.type || "").indexOf("支线") >= 0 || (t.title || "").indexOf("支线") >= 0).map((t) => ({ id: t.id, title: t.title, status: t.status, xpReward: t.xpReward, coinsReward: t.coinsReward, desc: (t.xpReward ? t.xpReward + " XP" : "") + (t.coinsReward ? " · " + t.coinsReward + " 金币" : "") }));
          this.setData({ list: list.length ? list : [], sideQuestTitle: "" });
          break;
        }
        case "entertainment": {
          const res = await get("entertainment/logs");
          const d = unwrap(res);
          const logs = Array.isArray(d.logs) ? d.logs : [];
          const list = logs.slice(0, 20).map((l) => ({ title: l.activity || "娱乐", desc: (l.duration || 0) + " 分钟 · " + (l.at || "").slice(0, 10) }));
          this.setData({ list: list.length ? list : [], entActivity: "", entDuration: "" });
          break;
        }
        case "retrospect": {
          const res = await get("retrospects/v2");
          const d = unwrap(res);
          const items = Array.isArray(d.retrospects) ? d.retrospects : Array.isArray(d.items) ? d.items : [];
          const list = items.slice(0, 15).map((r) => ({ title: r.title || "复盘", desc: (r.updatedAt || r.answeredAt || r.createdAt || "").slice(0, 10) }));
          this.setData({ list: list.length ? list : [], retroTitle: "", retroContent: "" });
          break;
        }
        case "social": {
          const [feedRes, friendsRes] = await Promise.all([get("friends/feed"), get("friends").catch(() => ({ data: {} }))]);
          const feed = (feedRes.data && feedRes.data.feed) || [];
          const friends = (friendsRes.data && friendsRes.data.friends) || [];
          const list = feed.slice(0, 10).map((f) => ({ title: (f.user && (f.user.username || f.user.name)) || "好友", desc: f.title || f.content || "" }));
          this.setData({ list: list.length ? list : [{ title: "暂无好友动态", desc: "添加好友后可见" }], extra: { friendsCount: friends.length } });
          break;
        }
        case "shop": {
          const [itemsRes, finRes] = await Promise.all([get("reward-items"), get("finance/overview")]);
          const raw = itemsRes.data || {};
          const items = Array.isArray(raw.rewardItems) ? raw.rewardItems : [];
          const fin = unwrap(finRes);
          const coins = fin.coins != null ? fin.coins : 0;
          const list = items.map((i) => ({ id: i.id, title: (i.icon || "") + " " + (i.name || ""), desc: (i.coinCost != null ? i.coinCost : 0) + " 金币", coinCost: i.coinCost }));
          this.setData({ list: list.length ? list : [{ title: "暂无商品", desc: "" }], extra: { coins } });
          break;
        }
        case "motivation": {
          const res = await get("motivation/posts");
          const d = unwrap(res);
          const posts = Array.isArray(d.posts) ? d.posts : [];
          const list = posts.slice(0, 15).map((p) => ({ title: (p.text || p.content || p.title || "励志").slice(0, 80), desc: (p.createdAt || "").slice(0, 10) }));
          this.setData({ list: list.length ? list : [], motivationText: "" });
          break;
        }
        default:
          this.setData({ list: [{ title: "该功能", desc: "敬请期待" }] });
      }
    } catch (e) {
      console.error(e);
      this.setData({ error: "加载失败，请检查网络与后端", list: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  async onCompleteTask(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      const res = await post("tasks/" + id + "/complete");
      const d = res.data || {};
      if (d.error) {
        wx.showToast({ title: d.error, icon: "none" });
        return;
      }
      wx.showToast({ title: "完成", icon: "success" });
      this.loadData();
    } catch (err) {
      wx.showToast({ title: "操作失败", icon: "none" });
    }
  },

  async onRedeem(e) {
    const id = e.currentTarget.dataset.id;
    const cost = e.currentTarget.dataset.cost;
    if (!id) return;
    const coins = (this.data.extra && this.data.extra.coins) || 0;
    if (coins < (cost || 0)) {
      wx.showToast({ title: "金币不足", icon: "none" });
      return;
    }
    try {
      const res = await post("rewards/redeem", { data: { rewardItemId: id } });
      const d = res.data || {};
      if (d.error) {
        wx.showToast({ title: d.error, icon: "none" });
        return;
      }
      wx.showToast({ title: "兑换成功", icon: "success" });
      this.loadData();
    } catch (err) {
      wx.showToast({ title: "兑换失败", icon: "none" });
    }
  },

  onBack() {
    wx.navigateBack();
  },

  // 表单输入绑定
  onSideQuestInput(e) { this.setData({ sideQuestTitle: e.detail.value || "" }); },
  onEntActivityInput(e) { this.setData({ entActivity: e.detail.value || "" }); },
  onEntDurationInput(e) { this.setData({ entDuration: e.detail.value || "" }); },
  onFinanceTxTypeChange(e) {
    const idx = e.detail.value != null ? Number(e.detail.value) : 0;
    this.setData({ financeTxType: idx === 1 ? "income" : "expense" });
  },
  onFinanceTxAmountInput(e) { this.setData({ financeTxAmount: e.detail.value || "" }); },
  onFinanceTxNoteInput(e) { this.setData({ financeTxNote: e.detail.value || "" }); },
  onRetroTitleInput(e) { this.setData({ retroTitle: e.detail.value || "" }); },
  onRetroContentInput(e) { this.setData({ retroContent: e.detail.value || "" }); },
  onFriendIdInput(e) { this.setData({ friendId: e.detail.value || "" }); },
  onMotivationInput(e) { this.setData({ motivationText: e.detail.value || "" }); },
  onPlanVisionInput(e) { this.setData({ planVisionContent: e.detail.value || "" }); },
  onPlanBossInput(e) { this.setData({ planBossTitle: e.detail.value || "" }); },
  onPlanChallengeInput(e) { this.setData({ planChallengeTitle: e.detail.value || "" }); },
  onPlanSkillInput(e) { this.setData({ planSkillName: e.detail.value || "" }); },
  onWealthGoalTitleInput(e) { this.setData({ wealthGoalTitle: e.detail.value || "" }); },
  onWealthGoalAmountInput(e) { this.setData({ wealthGoalAmount: e.detail.value || "" }); },

  async onAddSideQuest() {
    const title = (this.data.sideQuestTitle || "").trim();
    if (!title) { wx.showToast({ title: "请输入目标", icon: "none" }); return; }
    try {
      const res = await post("tasks", { data: { title, type: "支线", xpReward: 8, coinsReward: 3 } });
      const d = res.data || {};
      if (d.error) { wx.showToast({ title: d.error, icon: "none" }); return; }
      wx.showToast({ title: "已添加支线", icon: "success" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },

  async onAddEntLog() {
    const activity = (this.data.entActivity || "").trim() || "娱乐";
    const duration = Number((this.data.entDuration || "").trim() || 0);
    try {
      const res = await post("entertainment/log", { data: { activity, duration } });
      const d = res.data || {};
      if (d.error) { wx.showToast({ title: d.error, icon: "none" }); return; }
      wx.showToast({ title: "娱乐已打卡，心情 +5", icon: "success" });
      this.setData({ entActivity: "", entDuration: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "提交失败", icon: "none" });
    }
  },

  async onAddTx() {
    const type = this.data.financeTxType || "expense";
    const amount = Number((this.data.financeTxAmount || "").trim());
    const note = (this.data.financeTxNote || "").trim();
    if (!amount || amount <= 0) { wx.showToast({ title: "请输入金额", icon: "none" }); return; }
    try {
      const res = await post("transactions", { data: { type, amount, note, category: type === "income" ? "收入" : "支出" } });
      const d = res.data || {};
      if (d.error) { wx.showToast({ title: d.error, icon: "none" }); return; }
      wx.showToast({ title: "已记一笔", icon: "success" });
      this.setData({ financeTxAmount: "", financeTxNote: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "记账失败", icon: "none" });
    }
  },

  async onSetWealthGoal() {
    const title = (this.data.wealthGoalTitle || "").trim();
    const targetAmount = Number((this.data.wealthGoalAmount || "").trim());
    if (!title || !targetAmount || targetAmount <= 0) { wx.showToast({ title: "填写目标名称与金额", icon: "none" }); return; }
    try {
      const res = await post("wealth-goals", { data: { title, targetAmount } });
      const d = res.data || {};
      if (d.error) { wx.showToast({ title: d.error, icon: "none" }); return; }
      wx.showToast({ title: "已设置财富目标", icon: "success" });
      this.setData({ wealthGoalTitle: "", wealthGoalAmount: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "设置失败", icon: "none" });
    }
  },

  async onSaveRetrospect() {
    const title = (this.data.retroTitle || "").trim() || "复盘";
    const freeContent = (this.data.retroContent || "").trim();
    if (!freeContent) { wx.showToast({ title: "写点内容吧", icon: "none" }); return; }
    try {
      const res = await post("retrospects/v2", { data: { title, contentType: "free_text", freeContent } });
      const d = res.data || {};
      if (!d.success) { wx.showToast({ title: d.error || "保存失败", icon: "none" }); return; }
      wx.showToast({ title: "复盘已保存", icon: "success" });
      this.setData({ retroTitle: "", retroContent: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  async onAddFriend() {
    const friendId = (this.data.friendId || "").trim();
    if (!friendId) { wx.showToast({ title: "请输入好友 ID 或用户名", icon: "none" }); return; }
    const id = isNaN(Number(friendId)) ? friendId : Number(friendId);
    try {
      const res = await post("friends/" + id, { data: {} });
      const d = res.data || {};
      if (d.error) { wx.showToast({ title: d.error, icon: "none" }); return; }
      wx.showToast({ title: "已发送好友请求", icon: "success" });
      this.setData({ friendId: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },

  async onPostMotivation() {
    const text = (this.data.motivationText || "").trim();
    if (!text) { wx.showToast({ title: "先写点什么吧", icon: "none" }); return; }
    try {
      const res = await post("motivation/posts", { data: { text } });
      const d = res.data || {};
      if (!d.success) { wx.showToast({ title: d.error || "发布失败", icon: "none" }); return; }
      wx.showToast({ title: "已发布", icon: "success" });
      this.setData({ motivationText: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "发布失败", icon: "none" });
    }
  },

  async onAddVision() {
    const content = (this.data.planVisionContent || "").trim();
    if (!content) { wx.showToast({ title: "请输入人生水晶内容", icon: "none" }); return; }
    try {
      await post("visions", { data: { content } });
      wx.showToast({ title: "已添加", icon: "success" });
      this.setData({ planVisionContent: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },

  async onAddBoss() {
    const title = (this.data.planBossTitle || "").trim();
    if (!title) { wx.showToast({ title: "请输入 Boss 标题", icon: "none" }); return; }
    const visions = (this.data.extra && this.data.extra.visions) || [];
    const visionId = visions[0] && visions[0].id;
    if (!visionId) { wx.showToast({ title: "请先添加人生水晶", icon: "none" }); return; }
    try {
      await post("bosses", { data: { title, visionId } });
      wx.showToast({ title: "已添加 Boss", icon: "success" });
      this.setData({ planBossTitle: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },

  async onAddChallenge() {
    const title = (this.data.planChallengeTitle || "").trim();
    if (!title) { wx.showToast({ title: "请输入挑战标题", icon: "none" }); return; }
    const bosses = (this.data.extra && this.data.extra.bosses) || [];
    const bossId = bosses[0] && bosses[0].id;
    if (!bossId) { wx.showToast({ title: "请先添加 Boss", icon: "none" }); return; }
    try {
      await post("challenges", { data: { title, bossId } });
      wx.showToast({ title: "已添加挑战", icon: "success" });
      this.setData({ planChallengeTitle: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },

  async onAddSkill() {
    const name = (this.data.planSkillName || "").trim();
    if (!name) { wx.showToast({ title: "请输入技能名称", icon: "none" }); return; }
    try {
      await post("skills", { data: { name } });
      wx.showToast({ title: "已添加技能", icon: "success" });
      this.setData({ planSkillName: "" });
      this.loadData();
    } catch (e) {
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },
});
