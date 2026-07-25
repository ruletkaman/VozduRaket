const cases = {
  sotka: { price: 100, items: [{name:'Утешение 10 ₽',win:10,chance:24.8},{name:'Сейф 60 ₽',win:60,chance:40.0},{name:'Сейф 140 ₽',win:140,chance:25.0},{name:'Топ 500 ₽',win:500,chance:10.0},{name:'Джекпот',win:2000,chance:0.2}] },
  pyzh: { price: 500, items: [{name:'Утешение 25 ₽',win:25,chance:2.86},{name:'Утешение 50 ₽',win:50,chance:8.7},{name:'Сейф 250 ₽',win:250,chance:13.0},{name:'Сейф 350 ₽',win:350,chance:13.0},{name:'Сейф 450 ₽',win:450,chance:13.0},{name:'Сейф 550 ₽',win:550,chance:13.0},{name:'Сейф 650 ₽',win:650,chance:13.0},{name:'Топ 800 ₽',win:800,chance:14.54},{name:'Топ 1300 ₽',win:1300,chance:8.7},{name:'Джекпот',win:25000,chance:0.2}] },
  basic: { price: 1000, items: [{win:50,chance:3.5},{win:100,chance:3.5},{win:150,chance:3.5},{win:200,chance:3.5},{win:250,chance:3.5},{win:300,chance:3.0},{win:400,chance:2.0},{win:500,chance:5.7},{win:600,chance:5.7},{win:700,chance:6.0},{win:800,chance:6.0},{win:900,chance:6.0},{win:1000,chance:6.0},{win:1100,chance:6.0},{win:1200,chance:6.0},{win:1300,chance:6.0},{win:1400,chance:5.8},{win:1500,chance:5.8},{win:1600,chance:2.5},{win:1800,chance:2.0},{win:2000,chance:2.0},{win:2500,chance:1.5},{win:3000,chance:1.2},{win:3500,chance:0.8},{win:4000,chance:1.0},{win:5000,chance:0.6},{win:7500,chance:0.3},{win:10000,chance:0.2},{win:15000,chance:0.2},{win:50000,chance:0.2}] },
  football: { price: 1000, items: [{name:'Резерв',win:50,chance:2.86},{name:'Защитник',win:100,chance:8.7},{name:'Полузащитник',win:500,chance:13.0},{name:'Полузащитник',win:700,chance:13.0},{name:'Вратарь',win:900,chance:13.0},{name:'Нападающий',win:1100,chance:13.0},{name:'Нападающий',win:1300,chance:13.0},{name:'Капитан',win:1600,chance:14.54},{name:'Тренер',win:2600,chance:8.7},{name:'Легенда (Джекпот)',win:50000,chance:0.2}] },
  power: { price: 5000, items: [{win:250,chance:3.45},{win:500,chance:3.5},{win:750,chance:3.5},{win:1000,chance:3.5},{win:1250,chance:2.8},{win:1500,chance:3.0},{win:1750,chance:2.8},{win:2000,chance:2.7},{win:2200,chance:2.8},{win:2400,chance:2.5},{win:2500,chance:2.5},{win:2750,chance:2.5},{win:3000,chance:2.5},{win:3250,chance:2.3},{win:3500,chance:2.3},{win:3750,chance:2.0},{win:4000,chance:2.0},{win:4250,chance:2.1},{win:4500,chance:2.2},{win:4750,chance:2.5},{win:5000,chance:2.3},{win:5200,chance:2.3},{win:5400,chance:2.0},{win:5600,chance:2.15},{win:5800,chance:3.52},{win:6000,chance:2.2},{win:6200,chance:1.8},{win:6400,chance:1.3},{win:6600,chance:0.9},{win:6800,chance:0.9},{win:7000,chance:0.75},{win:7100,chance:0.5},{win:7200,chance:0.4},{win:7300,chance:0.2},{win:7500,chance:0.15},{win:8000,chance:0.05},{win:9000,chance:0.05},{win:10000,chance:0.03},{win:12500,chance:3.45},{win:15000,chance:3.5},{win:17500,chance:3.5},{win:20000,chance:3.5},{win:25000,chance:2.5},{win:30000,chance:2.5},{win:40000,chance:2.5},{win:50000,chance:2.5},{win:75000,chance:2.0},{win:100000,chance:2.0},{win:125000,chance:2.0},{win:250000,chance:0.2}] }
};

function adjustChances(items, targetEV) {
    let working = items.map(i => ({...i}));
    for (let iter=0; iter<300; iter++) {
        let ev = working.reduce((sum, item) => sum + item.win * item.chance / 100, 0);
        let diff = targetEV - ev;
        if (Math.abs(diff) < 0.01) break;
        
        let avgWin = ev;
        if (diff > 0) {
            let lowItems = working.filter(i => i.win <= avgWin && i.chance > 0.01);
            let highItems = working.filter(i => i.win > avgWin);
            if (lowItems.length === 0 || highItems.length === 0) break;
            
            let freed = 0;
            lowItems.forEach(i => { let dec = i.chance * 0.02; i.chance -= dec; freed += dec; });
            let highSum = highItems.reduce((s, i) => s + i.chance, 0);
            highItems.forEach(i => { i.chance += freed * (i.chance / highSum); });
        } else {
            let lowItems = working.filter(i => i.win < avgWin);
            let highItems = working.filter(i => i.win >= avgWin && i.chance > 0.01);
            if (lowItems.length === 0 || highItems.length === 0) break;
            
            let freed = 0;
            highItems.forEach(i => { let dec = i.chance * 0.02; i.chance -= dec; freed += dec; });
            let lowSum = lowItems.reduce((s, i) => s + i.chance, 0);
            lowItems.forEach(i => { i.chance += freed * (i.chance / lowSum); });
        }
    }
    
    let total = working.reduce((s, i) => s + i.chance, 0);
    working.forEach(i => i.chance = i.chance / total * 100);
    return working;
}

const rtps = { casino: 0.85, honest: 1.00, boost: 1.15 };
const out = {};
for (const [key, data] of Object.entries(cases)) {
    out[key] = {};
    for (const [mode, rtp] of Object.entries(rtps)) {
        const targetEV = data.price * rtp;
        let adjusted = adjustChances(data.items, targetEV);
        adjusted.forEach(i => i.chance = Number(i.chance.toFixed(3)));
        let sum = adjusted.reduce((s, i) => s + i.chance, 0);
        let maxItem = adjusted.reduce((prev, curr) => (prev.chance > curr.chance) ? prev : curr);
        maxItem.chance = Number((maxItem.chance + (100 - sum)).toFixed(3));
        
        let finalEv = adjusted.reduce((s, i) => s + i.win * i.chance / 100, 0);
        out[key][mode] = adjusted;
    }
}

const fs = require('fs');
fs.writeFileSync('generated_cases.json', JSON.stringify(out, null, 2));
console.log('Successfully generated cases in generated_cases.json');
