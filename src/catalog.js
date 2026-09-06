const icon = (outline, detail = '') => '<path class="mini-solid" d="' + outline + '"/>' + (detail ? '<path class="mini-accent" d="' + detail + '"/>' : '');
const part = (id, name, desc, stats, category, outline = '') => {
  const labels = { power: 'POW', armor: 'ARM', speed: 'SPD', sync: 'SYN' };
  const strongest = Object.keys(stats).reduce((best, key) => stats[key] > stats[best] ? key : best, 'power');
  return { id, name, desc, stats, family: category, icon: outline, stat: '+' + stats[strongest] + ' ' + labels[strongest] };
};

export const partDefinitions = {
  chassis: {
    label: '躯干装甲', short: '躯干', code: 'CORE',
    options: [
      part('bulwark', 'BULWARK', '重型堡垒 / 稳定核心', { power: 10, armor: 18, speed: -3, sync: 2 }, 'STANDARD'),
      part('raptor', 'RAPTOR', '斜切装甲 / 反应装置', { power: 7, armor: 7, speed: 10, sync: 5 }, 'STANDARD'),
      part('specter', 'SPECTER', '隐匿骨架 / 轻量核心', { power: 5, armor: -3, speed: 13, sync: 14 }, 'STANDARD'),
      part('aerocore', '天隼 · AEROCORE', '长锥座舱 / 后掠进气装甲', { power: 8, armor: 0, speed: 17, sync: 8 }, 'AERO', icon('M11 13l15 6 6-12 6 12 15-6-9 17-12 11-12-11z', 'M28 22h8')),
      part('reactor', '熔炉 · FOUNDRY', '外露涡轮 / 箱式重装框架', { power: 17, armor: 20, speed: -5, sync: 1 }, 'INDUSTRIAL', icon('M13 12h38v27H13zM20 8h8v32h-8M38 8h8v32h-8', 'M29 23h8v8h-8z')),
      part('paladin', '圣盾 · PALADIN', '倒三角胸甲 / 分片裙甲', { power: 10, armor: 13, speed: 5, sync: 9 }, 'KNIGHT', icon('M11 10h42l-6 16-9 5 8 11-14-4-14 4 8-11-9-5z', 'M24 17h16l-8 8z'))
    ]
  },
  head: {
    label: '头部感知', short: '头部', code: 'HEAD',
    options: [
      part('visor', 'WIDE VISOR', '广域视觉 / 目标锁定', { power: 2, armor: 1, speed: 3, sync: 14 }, 'STANDARD'),
      part('horned', 'HORNED ARRAY', '高频天线 / 远距扫描', { power: 12, armor: 0, speed: -1, sync: 8 }, 'STANDARD'),
      part('sensor', 'SENSOR POD', '独立侦察 / 低耗运行', { power: 1, armor: 2, speed: 9, sync: 10 }, 'STANDARD'),
      part('wedge', '游隼 · KESTREL', '无面楔形头 / 双翼雷达', { power: 4, armor: -2, speed: 14, sync: 9 }, 'AERO', icon('M9 12l16 8 7-11 7 11 16-8-13 20-10 8-10-8z', 'M27 26h10')),
      part('monoeye', '独眼 · WATCHER', '重甲单眼 / 横向观测窗', { power: 8, armor: 10, speed: -2, sync: 12 }, 'INDUSTRIAL', icon('M18 13l8-5h15l8 10-3 20H17l-3-18z', 'M21 23h21M31 21v5')),
      part('vcrest', '王冠 · CROWN', '分叉额冠 / 双目面甲', { power: 9, armor: 3, speed: 4, sync: 13 }, 'KNIGHT', icon('M22 18l-9-12 17 11h4L51 6 42 18v13l-10 9-10-9z', 'M25 24h5M34 24h5'))
    ]
  },
  arms: {
    label: '肩甲与机械臂', short: '臂甲', code: 'ARMS',
    options: [
      part('gauntlet', 'GAUNTLET', '重击拳套 / 近战压制', { power: 15, armor: 7, speed: -4, sync: 2 }, 'STANDARD'),
      part('lancer', 'LANCER', '长距挂载 / 精准射击', { power: 12, armor: 2, speed: 2, sync: 8 }, 'STANDARD'),
      part('talon', 'TALON', '双刃爪臂 / 快速连击', { power: 8, armor: -1, speed: 14, sync: 4 }, 'STANDARD'),
      part('aerofins', '掠翼 · SWIFT', '后掠肩翼 / 薄刃前臂', { power: 9, armor: -4, speed: 18, sync: 6 }, 'AERO', icon('M9 8l19 10-7 10-5 13H9l5-16zM55 8L36 18l7 10 5 13h7l-5-16z', 'M15 25l-2 10M49 25l2 10')),
      part('siege', '铁壁 · RAMPART', '不对称肩盾 / 抗炮击臂甲', { power: 10, armor: 23, speed: -5, sync: 1 }, 'INDUSTRIAL', icon('M7 12h21v14h-6v17H7zM39 13h15v12h-5v16H39z', 'M11 22h8v13h-8')),
      part('pauldrons', '骑士 · REGALIA', '叠层尖肩 / 细长护臂', { power: 13, armor: 9, speed: 4, sync: 7 }, 'KNIGHT', icon('M7 9l20 8-5 9-4-1v16h-8V24L5 21zM57 9l-20 8 5 9 4-1v16h8V24l5-3z', 'M12 30h4M48 30h4'))
    ]
  },
  legs: {
    label: '下肢与行走底盘', short: '腿部', code: 'LEGS',
    options: [
      part('strider', 'STRIDER', '多段关节 / 地形适应', { power: 2, armor: -3, speed: 20, sync: 7 }, 'STANDARD'),
      part('anchor', 'ANCHOR', '重型支撑 / 抗冲击', { power: 4, armor: 17, speed: -8, sync: 2 }, 'STANDARD'),
      part('hover', 'HOVER RIG', '磁悬浮台 / 极限闪避', { power: 3, armor: -7, speed: 22, sync: 6 }, 'STANDARD'),
      part('reverse', '猎隼 · RAPID JOINT', '鸟足逆关节 / 长行程液压', { power: 3, armor: -5, speed: 27, sync: 5 }, 'AERO', icon('M19 8h10l-9 13 9 12-8 8H10l9-10-8-11zM35 8h10l8 12-8 11 9 10H43l-8-8 9-12z', 'M18 19h8M39 19h8')),
      part('tetrapod', '蛛卫 · TETRA', '四足支撑 / 展开式炮台底盘', { power: 11, armor: 19, speed: -5, sync: 7 }, 'INDUSTRIAL', icon('M25 12h14v12H25zM25 16l-13 4-8 16h6l8-11 7-2M39 16l13 4 8 16h-6l-8-11-7-2M26 23l-6 18h7l5-15 5 15h7l-6-18', 'M28 17h8')),
      part('treads', '陆堡 · LANDSHIP', '双履带底盘 / 低重心重装', { power: 14, armor: 28, speed: -9, sync: 0 }, 'INDUSTRIAL', icon('M25 10h14v13H25zM7 22h50v18H7zM11 26h16v10H11zM37 26h16v10H37z', 'M12 31h13M39 31h13'))
    ]
  },
  weapon: {
    label: '主武器', short: '武器', code: 'WEAPON',
    options: [
      part('railgun', 'RAIL CANNON', '线圈加速 / 穿透打击', { power: 16, armor: 1, speed: -3, sync: 5 }, 'STANDARD'),
      part('arc', 'ARC BLOOM', '电弧扩散 / 群体控制', { power: 11, armor: 0, speed: 0, sync: 12 }, 'STANDARD'),
      part('monoblade', 'MONO BLADE', '单分子刃 / 近身决斗', { power: 13, armor: 0, speed: 11, sync: 4 }, 'STANDARD'),
      part('gatling', '风暴 · VULCAN', '六管转轮 / 持续火力', { power: 25, armor: 2, speed: -4, sync: -2 }, 'INDUSTRIAL', icon('M9 18h18v18H9zM27 20h28v4H27zM27 29h28v4H27z', 'M31 25h24')),
      part('missiles', '蜂巢 · HIVE', '多联装火箭 / 弧线齐射', { power: 22, armor: 1, speed: -9, sync: 6 }, 'INDUSTRIAL', icon('M12 10h39v29H12z', 'M19 17h5v5h-5zM30 17h5v5h-5zM41 17h5v5h-5zM19 28h5M30 28h5M41 28h5')),
      part('beamblade', '曙光 · DAWNBLADE', '长柄光刃 / 扫掠斩击', { power: 18, armor: -1, speed: 9, sync: 10 }, 'KNIGHT', icon('M27 34l-3-15 8-15 8 15-3 15zM21 35h22v4H21zM29 39h6v7h-6z', 'M32 10v25'))
    ]
  },
  backpack: {
    label: '背包与推进挂载', short: '背包', code: 'PACK',
    options: [
      part('compact', '标准 · VECTOR', '紧凑双喷 / 通用整备', { power: 0, armor: 0, speed: 0, sync: 0 }, 'STANDARD', icon('M20 13h24v25H20zM13 16h8v24h-8zM43 16h8v24h-8z', 'M14 37h6M44 37h6')),
      part('wings', '天翼 · SKYRAKE', '后掠双翼 / 翼尖推进器', { power: 3, armor: -6, speed: 18, sync: 4 }, 'AERO', icon('M28 15h8v25h-8zM26 19L5 5l5 27 14 8zM38 19L59 5l-5 27-14 8z', 'M12 18l9 15M52 18l-9 15')),
      part('missilepack', '堡垒 · ARSENAL', '肩后弹舱 / 双联重炮', { power: 16, armor: 6, speed: -3, sync: 0 }, 'INDUSTRIAL', icon('M9 8h17v29H9zM38 8h17v29H38zM26 21h12v18H26z', 'M13 15h9M42 15h9M13 23h9M42 23h9')),
      part('funnels', '星环 · SATELLITE', '六枚浮游模块 / 扇形阵列', { power: 11, armor: -3, speed: 2, sync: 15 }, 'KNIGHT', icon('M28 18h8v23h-8zM5 8l5-2 9 27-5 2zM15 4l5-1 7 27-5 1zM59 8l-5-2-9 27 5 2zM49 4l-5-1-7 27 5 1z', 'M30 24h4')),
      part('reactorpack', '日冕 · CORONA', '环形反应堆 / 散热鳍阵', { power: 9, armor: 5, speed: -7, sync: 17 }, 'INDUSTRIAL', '<circle class="mini-solid" cx="32" cy="24" r="18"/><circle class="mini-edge" cx="32" cy="24" r="12"/>' + icon('M25 15h14v24H25z', 'M29 21h6')),
      part('booster', '彗尾 · COMET', '双矢量大喷口 / 冲刺框架', { power: 0, armor: -3, speed: 24, sync: 3 }, 'AERO', icon('M11 12h16v24H11zM37 12h16v24H37zM27 18h10v13H27z', 'M15 38h8l-4 7zM41 38h8l-4 7z'))
    ]
  }
};

export const defaultParts = { chassis: 'bulwark', head: 'visor', arms: 'gauntlet', legs: 'strider', weapon: 'railgun', backpack: 'compact' };
export const buildPresets = [
  { id: 'aero', name: '飞翼突击', code: 'AERO', color: 'cyan', parts: { chassis: 'aerocore', head: 'wedge', arms: 'aerofins', legs: 'reverse', weapon: 'beamblade', backpack: 'wings' } },
  { id: 'industrial', name: '重装兵器', code: 'SIEGE', color: 'amber', parts: { chassis: 'reactor', head: 'monoeye', arms: 'siege', legs: 'treads', weapon: 'gatling', backpack: 'missilepack' } },
  { id: 'knight', name: '棱角骑士', code: 'KNIGHT', color: 'coral', parts: { chassis: 'paladin', head: 'vcrest', arms: 'pauldrons', legs: 'anchor', weapon: 'beamblade', backpack: 'funnels' } }
];

export const chassisNames = {
  bulwark: ['AXIOM', '041', 'AX'], raptor: ['RAPTOR', '077', 'RP'], specter: ['SPECTER', '013', 'SP'],
  aerocore: ['KESTREL', '092', 'KE'], reactor: ['FOUNDRY', '808', 'FD'], paladin: ['PALADIN', '001', 'PL']
};
