const fs = require('fs');
const cases = JSON.parse(fs.readFileSync('generated_cases.json', 'utf8'));

let newCode = `// ==========================================
// GAME LOGIC MODULE (BACKEND READY)
// ==========================================

function getRtpMode() {
    return (window.userData && window.userData.rtpMode) ? window.userData.rtpMode : 'casino';
}

class CaseModule {
  static getCasesData() {
    return ${JSON.stringify(cases, null, 4)};
  }

  static getSotkaConfig() { return this.getCasesData().sotka[getRtpMode()]; }
  static getPyzhikConfig() { return this.getCasesData().pyzh[getRtpMode()]; }
  static getBasicConfig() { return this.getCasesData().basic[getRtpMode()]; }
  static getFootballConfig() { return this.getCasesData().football[getRtpMode()]; }
  static getMightConfig() { return this.getCasesData().power[getRtpMode()]; }

  static openCase(itemsConfig) {
    const r = Math.random() * 100;
    let sum = 0;
    for (let i = 0; i < itemsConfig.length; i++) {
      sum += itemsConfig[i].chance;
      if (r <= sum) return { item: itemsConfig[i], index: i };
    }
    return { item: itemsConfig[0], index: 0 };
  }
}

class UpgradeModule {
  static calculateChance(playerSum, targetSum) {
    let mode = getRtpMode();
    let targetRTP = mode === 'honest' ? 100 : (mode === 'boost' ? 115 : 95);
    return Math.min(100, (playerSum / targetSum) * targetRTP);
  }

  static simulateUpgrade(playerSum, targetSum) {
    const chance = this.calculateChance(playerSum, targetSum);
    const r = Math.random() * 100;
    return {
      success: r <= chance,
      chance: chance,
      roll: r
    };
  }
}

class CrashModule {
  static generateCrashPoint() {
    let mode = getRtpMode();
    let targetRTP = mode === 'honest' ? 1.00 : (mode === 'boost' ? 1.15 : 0.95);
    const multiplier = targetRTP / (1 - Math.random());
    return Math.floor(multiplier * 100) / 100; // truncate to 2 decimal places
  }
}

class RouletteModule {
  static spin(betColor) {
    let mode = getRtpMode();
    let targetRTP = mode === 'honest' ? 1.00 : (mode === 'boost' ? 1.15 : 0.95);
    
    // x2.5 for red/black, x14.375 for green
    let winChance = betColor === 'green' ? (targetRTP / 14.375) * 100 : (targetRTP / 2.50) * 100;
    
    let r = Math.random() * 100;
    if (r < winChance) {
      return { color: betColor, multiplier: betColor === 'green' ? 14.375 : 2.50 };
    } else {
      let others = ['red', 'black', 'green'].filter(c => c !== betColor);
      let failColor = others[Math.floor(Math.random() * others.length)];
      return { color: failColor, multiplier: failColor === 'green' ? 14.375 : 2.50 };
    }
  }
}

export { CaseModule, UpgradeModule, CrashModule, RouletteModule };
`;

fs.writeFileSync('gameLogic.js', newCode);
console.log('gameLogic.js updated');
