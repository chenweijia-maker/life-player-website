const FEATURE_DESC = {
  schedule: "记录每日饮食与作息，养成规律生活。支持早/中/晚打卡与睡眠时长。",
  plan: "制定周计划、月计划，拆解目标为可执行任务，与主线/Boss 对齐。",
  finance: "记录收支、设定预算，用金币与余额可视化你的财务习惯。",
  sideQuests: "管理支线任务与兴趣目标，与主线互补，丰富人生体验。",
  entertainment: "记录娱乐与放松时间，平衡学习与休息，避免过劳。",
  retrospect: "定期复盘：回顾目标完成度、原因分析与下次改进点。",
  social: "好友动态、公会/小组，与同路人互相激励、分享进度。",
  shop: "用金币兑换奖励与补给包，激励自己完成目标。",
  motivation: "收藏励志语录、写下今日一句，为自己打气。",
  crystal: "设定人生水晶与阶段 Boss，填写愿景、挑战与技能标签。",
  supply: "管理情景补给包，快速创建与使用精力饮料、静心茶等。",
};

Page({
  data: {
    title: "功能",
    view: "",
    desc: "",
  },

  onLoad(options) {
    const title = options && options.title ? decodeURIComponent(options.title) : "功能";
    const view = (options && options.view ? decodeURIComponent(options.view) : "") || "";
    const desc = FEATURE_DESC[view] || "该功能即将上线，敬请期待。";
    this.setData({ title, view, desc });
  },

  onBack() {
    wx.navigateBack();
  },
});
