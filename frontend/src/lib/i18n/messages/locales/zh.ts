import type { I18nMessages } from "../types";

export const messagesZh: I18nMessages = {
  nav: {
    dashboard: "仪表盘",
    swap: "兑换",
    market: "市场",
    orders: "订单",
    htlcs: "HTLC",
    settings: "设置",
    protocol: "协议",
    explorer: "浏览器",
    about: "关于",
    admin: "管理",
  },
  commandPalette: {
    title: "快捷操作",
    placeholder: "搜索路由、订单、交换、命令...",
    empty: "没有匹配结果",
    routes: "路由",
    orders: "订单",
    swaps: "交换",
    commands: "命令",
    openButton: "打开命令面板",
  },
  feeBanner: {
    warningTitle: "检测到较高网络费用",
    criticalTitle: "高拥堵风险",
    dismiss: "关闭",
    snooze: "稍后 30 分钟",
    guidancePrefix: "建议",
  },
};
