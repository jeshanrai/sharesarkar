import { Router } from "express";

const router = Router();

const mockStocks = [
  { symbol: "NABIL", name: "Nabil Bank", price: 1245.0, change: 15.0, changePercent: 1.22 },
  { symbol: "NICA", name: "NIC Asia Bank", price: 892.0, change: -8.5, changePercent: -0.94 },
  { symbol: "NLIC", name: "Nepal Life Insurance", price: 1120.0, change: 25.0, changePercent: 2.28 },
  { symbol: "NTC", name: "Nepal Telecom", price: 785.0, change: 12.0, changePercent: 1.55 },
  { symbol: "HIDCL", name: "HIDCL", price: 456.0, change: -3.0, changePercent: -0.65 },
  { symbol: "UPPER", name: "Upper Tamakoshi", price: 398.0, change: 8.0, changePercent: 2.05 },
  { symbol: "CHCL", name: "Chilime Hydropower", price: 567.0, change: -12.0, changePercent: -2.07 },
  { symbol: "SBL", name: "Siddhartha Bank", price: 412.0, change: 5.5, changePercent: 1.35 },
  { symbol: "SHIVM", name: "Shivam Cements", price: 634.0, change: 18.0, changePercent: 2.92 },
  { symbol: "NLICL", name: "Nepal Life Insurance", price: 945.0, change: -15.0, changePercent: -1.56 },
];

router.get("/", (_req, res) => {
  res.json(mockStocks);
});

router.get("/gainers", (_req, res) => {
  const gainers = mockStocks
    .filter((s) => s.change > 0)
    .sort((a, b) => b.changePercent - a.changePercent);
  res.json(gainers);
});

router.get("/losers", (_req, res) => {
  const losers = mockStocks
    .filter((s) => s.change < 0)
    .sort((a, b) => a.changePercent - b.changePercent);
  res.json(losers);
});

export default router;
