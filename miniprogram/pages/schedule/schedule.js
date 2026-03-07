const { get, post } = require("../../utils/request");

Page({
  data: {
    r90WakeTime: "07:00",
    r90TargetCycles: 5,
    r90Options: [],
    r90LastReport: null,
    r90Overview: null,
    scheduleLogging: null,
  },

  onLoad() {
    this.loadR90Recommendations();
    this.loadR90Overview();
  },

  async loadR90Recommendations() {
    try {
      const res = await get("schedule/r90/recommendations");
      const data = (res && res.data) || {};
      if (data.error) return;
      const options = (data.options || []).map((o) => {
        const bed = o.bedAt ? new Date(o.bedAt) : null;
        return {
          ...o,
          bedAtText: bed ? bed.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
        };
      });
      this.setData({
        r90WakeTime: data.wakeTime || this.data.r90WakeTime,
        r90Options: options,
      });
    } catch (e) {}
  },

  async loadR90Overview() {
    try {
      const res = await get("schedule/r90/overview");
      const data = (res && res.data) || {};
      if (data.error) return;
      this.setData({ r90Overview: data });
    } catch (e) {}
  },

  onWakeTimeInput(e) {
    this.setData({ r90WakeTime: e.detail.value });
  },

  async onLockWakeTime() {
    const { r90WakeTime } = this.data;
    try {
      const res = await post("schedule/r90/settings", { data: { wakeTime: r90WakeTime } });
      const data = (res && res.data) || {};
      if (data.error) {
        wx.showToast({ title: data.error, icon: "none" });
        return;
      }
      wx.showToast({ title: "已锁定起床时间", icon: "success" });
      this.loadR90Recommendations();
    } catch (e) {
      wx.showToast({ title: "请求失败", icon: "none" });
    }
  },

  onSelectCycles(e) {
    const cycles = e.currentTarget.dataset.cycles;
    if (cycles != null) this.setData({ r90TargetCycles: cycles });
  },

  async onStartSleep() {
    const { r90WakeTime, r90TargetCycles } = this.data;
    this.setData({ scheduleLogging: "r90_start" });
    try {
      const res = await post("schedule/r90/start", {
        data: { wakeTime: r90WakeTime, targetCycles: r90TargetCycles },
      });
      const data = (res && res.data) || {};
      if (data.error) {
        wx.showToast({ title: data.error, icon: "none" });
        return;
      }
      if (data.rewards && data.rewards.message) {
        wx.showToast({ title: data.rewards.message, icon: "none" });
      }
      wx.navigateBack();
    } catch (e) {
      wx.showToast({ title: "请求失败", icon: "none" });
    } finally {
      this.setData({ scheduleLogging: null });
    }
  },

  async onWake() {
    this.setData({ scheduleLogging: "r90_wake" });
    try {
      const res = await post("schedule/r90/wake");
      const r = (res && res.data) || {};
      if (r.error) {
        wx.showToast({ title: r.error, icon: "none" });
        return;
      }
      const report = r.report || null;
      const r90LastReport = report
        ? { ...report, hoursText: report.minutes != null ? (report.minutes / 60).toFixed(1) : "0" }
        : null;
      this.setData({ r90LastReport });
      this.loadR90Overview();
      wx.showToast({ title: "已领取周期结算", icon: "success" });
    } catch (e) {
      wx.showToast({ title: "请求失败", icon: "none" });
    } finally {
      this.setData({ scheduleLogging: null });
    }
  },

  onBack() {
    wx.navigateBack();
  },
});
