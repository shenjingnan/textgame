// ============================================================
// 苍梧山脉世界数据 — 静态区域、地点、NPC 定义
// ============================================================

import type { Location, NPC, Realm, Region } from '../game/types';

// ==================== 辅助 ====================

function makeRealm(
  name: '炼气' | '筑基' | '金丹' | '元婴',
  subStage: '前期' | '中期' | '后期' | '圆满'
): Realm {
  const realmIndex = ['炼气', '筑基', '金丹', '元婴'].indexOf(name);
  const subIndex = ['前期', '中期', '后期', '圆满'].indexOf(subStage);
  return {
    name,
    subStage,
    progressIndex: realmIndex * 4 + subIndex,
    cultivation: 0,
  };
}

// ==================== NPC 定义 ====================

// 苍梧城 NPC
const oldChen: NPC = {
  id: 'old_chen',
  name: '老陈',
  realm: makeRealm('筑基', '中期'),
  faction: '散修联盟',
  attitude: 'friendly',
  role: 'merchant',
  personality: '热情仗义，消息灵通，在苍梧城经营杂货铺数十年',
  inventory: [],
  description: '苍梧城杂货铺老板，身材微胖，笑容可掬。铺子里摆满了修炼所需的各种物资。',
};

const cityGuard: NPC = {
  id: 'city_guard',
  name: '赵护卫',
  realm: makeRealm('筑基', '后期'),
  faction: '散修联盟',
  attitude: 'neutral',
  role: 'wanderer',
  personality: '沉默寡言，恪尽职守',
  inventory: [],
  description: '苍梧城守卫队长，腰间佩刀，神情严肃地巡视着城门。',
};

const elderWanderer: NPC = {
  id: 'elder_wanderer',
  name: '云游老者',
  realm: makeRealm('金丹', '后期'),
  faction: '',
  attitude: 'friendly',
  role: 'mentor',
  personality: '见多识广，偶尔指点后辈，话语间暗藏玄机',
  inventory: [],
  description: '白发苍苍的老者，手持竹杖，常在城中茶摊品茶，看似普通却偶有惊人言语。',
};

// 城外密林 NPC
const herbGatherer: NPC = {
  id: 'herb_gatherer',
  name: '采药人',
  realm: makeRealm('炼气', '后期'),
  faction: '散修联盟',
  attitude: 'friendly',
  role: 'wanderer',
  personality: '勤劳朴实，对灵草分布了如指掌',
  inventory: [],
  description: '背着药篓的中年采药人，常年穿梭于密林之中采集灵草。',
};

// 灵溪谷 NPC
const valleyHermit: NPC = {
  id: 'valley_hermit',
  name: '谷中隐士',
  realm: makeRealm('金丹', '圆满'),
  faction: '',
  attitude: 'neutral',
  role: 'mentor',
  personality: '不问世事，潜心修炼，偶尔愿意指点有缘人',
  inventory: [],
  description: '隐居灵溪谷深处的神秘修士，据说已在谷中修炼百年。',
};

const spiritPython: NPC = {
  id: 'spirit_python',
  name: '灵溪蟒',
  realm: makeRealm('筑基', '中期'),
  faction: '',
  attitude: 'hostile',
  role: 'wanderer',
  personality: '领地意识极强的妖兽，会攻击进入其领地的修士',
  inventory: [],
  description: '一条通体碧绿的巨蟒，鳞片闪烁着灵光，盘踞在灵溪谷深处的溪流旁。',
};

// 青云宗外门 NPC
const stewardWang: NPC = {
  id: 'steward_wang',
  name: '王执事',
  realm: makeRealm('筑基', '圆满'),
  faction: '青云宗',
  attitude: 'neutral',
  role: 'quest_giver',
  personality: '按规矩办事，不苟言笑，但对有潜力的散修也愿给机会',
  inventory: [],
  description: '青云宗外门执事，负责接待来客和安排杂役任务。身穿青色道袍，表情严肃。',
};

const seniorLi: NPC = {
  id: 'senior_li',
  name: '李师兄',
  realm: makeRealm('筑基', '后期'),
  faction: '青云宗',
  attitude: 'neutral',
  role: 'rival',
  personality: '骄傲自负，看不起散修，尤其喜欢刁难新来的外门弟子',
  inventory: [],
  description: '青云宗外门弟子中的佼佼者，剑眉星目，嘴角常挂着一丝不屑。',
};

const elderChuangong: NPC = {
  id: 'elder_chuanggong',
  name: '传功长老',
  realm: makeRealm('金丹', '中期'),
  faction: '青云宗',
  attitude: 'friendly',
  role: 'elder',
  personality: '德高望重，循循善诱',
  inventory: [],
  description: '青云宗外门传功长老，鹤发童颜，负责指导外门弟子基础功法。',
};

// 废弃矿洞 NPC
const stoneDemon: NPC = {
  id: 'stone_demon',
  name: '石魔',
  realm: makeRealm('筑基', '圆满'),
  faction: '',
  attitude: 'hostile',
  role: 'wanderer',
  personality: '由矿洞怨气凝结而成的妖兽，对所有活物充满敌意',
  inventory: [],
  description: '由碎石和矿渣组成的巨大魔物，双眼燃烧着幽绿色的火焰，镇守着矿洞深处。',
};

// 古修洞府 NPC
const caveRemnant: NPC = {
  id: 'cave_remnant',
  name: '洞府残魂',
  realm: makeRealm('元婴', '前期'),
  faction: '',
  attitude: 'neutral',
  role: 'mentor',
  personality: '一缕残存的神念，记忆不全，但保留了部分修炼心得',
  inventory: [],
  description: '半透明的老者虚影，时隐时现，是古代修士留下的最后一缕神念。',
};

// ==================== 地点定义 ====================

const cangwuCity: Location = {
  id: 'cangwu_city',
  name: '苍梧城',
  region: '苍梧山脉',
  type: 'city',
  dangerLevel: 1,
  realmSuitability: 0,
  connections: ['outside_forest'],
  npcs: [oldChen, cityGuard, elderWanderer],
  description:
    '苍梧城坐落于苍梧山脉南麓，是方圆百里散修聚集交易之地。' +
    '城内街道纵横，店铺林立，灵石灵气弥漫。城中心有一座古老的传送阵遗迹，' +
    '虽已无法使用，但仍散发着微弱的光芒。',
};

const outsideForest: Location = {
  id: 'outside_forest',
  name: '城外密林',
  region: '苍梧山脉',
  type: 'wilderness',
  dangerLevel: 3,
  realmSuitability: 0,
  connections: ['cangwu_city', 'spirit_valley', 'abandoned_mine'],
  npcs: [herbGatherer],
  description:
    '苍梧城外的茂密森林，古木参天，遮天蔽日。林间小径蜿蜒曲折，' +
    '随处可见灵草灵药的微光。但密林深处时有妖兽出没，散修多结伴而行。' +
    '空气中弥漫着泥土和草木的清香，偶尔传来几声不知名妖兽的低吼。',
};

const spiritValley: Location = {
  id: 'spirit_valley',
  name: '灵溪谷',
  region: '苍梧山脉',
  type: 'wilderness',
  dangerLevel: 5,
  realmSuitability: 4,
  connections: ['outside_forest', 'qingyun_outer'],
  npcs: [valleyHermit, spiritPython],
  description:
    '灵溪谷是苍梧山脉中灵气最为浓郁的地方之一。一条清澈的灵溪蜿蜒流过谷底，' +
    '溪水因蕴含灵气而泛着淡淡的蓝光。谷中灵气成雾，修炼效果远胜外界，' +
    '但也因此吸引了许多强大的妖兽在此盘踞。',
};

const qingyunOuter: Location = {
  id: 'qingyun_outer',
  name: '青云宗外门',
  region: '苍梧山脉',
  type: 'sect',
  dangerLevel: 2,
  realmSuitability: 0,
  connections: ['spirit_valley'],
  npcs: [stewardWang, seniorLi, elderChuangong],
  description:
    '青云宗外门坐落于灵溪谷北侧的山腰上，青砖黛瓦，古朴庄重。' +
    '山门前立着一块巨大的石碑，上书"青云宗"三个大字，笔力遒劲，隐有剑意。' +
    '外门虽不若内门气派，但也有藏经阁、丹药堂、演武场等设施，' +
    '散修若想加入青云宗，需先在外门完成试炼。',
};

const abandonedMine: Location = {
  id: 'abandoned_mine',
  name: '废弃矿洞',
  region: '苍梧山脉',
  type: 'dungeon',
  dangerLevel: 7,
  realmSuitability: 4,
  connections: ['outside_forest'],
  npcs: [stoneDemon],
  description:
    '废弃矿洞位于密林深处的一座小山丘下，洞口阴森漆黑，' +
    '时有阴风从洞中吹出，发出呜呜的声响。据说这里曾是青云宗的灵石矿场，' +
    '因矿洞深处挖到了不祥之物而被封禁。如今成了妖兽盘踞的危险之地，' +
    '但也有传闻说矿洞深处仍有未被开采的上品灵石。',
};

const ancientCave: Location = {
  id: 'ancient_cave',
  name: '古修洞府',
  region: '苍梧山脉',
  type: 'secret_realm',
  dangerLevel: 9,
  realmSuitability: 8,
  connections: [],
  npcs: [caveRemnant],
  description:
    '隐藏在苍梧山脉深处的古代修士洞府，入口被一道古老的禁制所封印，' +
    '只有有缘之人才能找到并进入。洞府内布满了复杂的阵法和禁制，' +
    '每一道禁制都蕴含着上古修士的智慧和力量。传言洞府中藏有上古修士的毕生心血——' +
    '一部失传已久的顶级功法。',
};

// ==================== 区域定义 ====================

export const CANGWU_MOUNTAINS: Region[] = [
  {
    name: '苍梧山脉',
    description:
      '苍梧山脉绵延三千里，灵气充沛，是散修聚集之地。' +
      '山脉中盘踞着青云宗（正道）、天邪教（魔道）、散修联盟（中立）三大势力，' +
      '彼此制衡，维持着微妙的平衡。',
    locations: [cangwuCity, outsideForest, spiritValley, qingyunOuter, abandonedMine, ancientCave],
    dominantFaction: '散修联盟',
    realmRange: [0, 35],
  },
];

// ==================== 查询辅助函数 ====================

const locationMap = new Map<string, Location>();
for (const region of CANGWU_MOUNTAINS) {
  for (const location of region.locations) {
    locationMap.set(location.id, location);
  }
}

/** 根据 ID 查找地点 */
export function getLocationById(id: string): Location | undefined {
  return locationMap.get(id);
}

/** 获取某个地点可前往的地点列表 */
export function getConnectedLocations(id: string): Location[] {
  const location = getLocationById(id);
  if (!location) return [];
  return location.connections
    .map((connId) => getLocationById(connId))
    .filter((loc): loc is Location => loc !== undefined);
}

/** 获取某个地点的 NPC 列表 */
export function getNPCsAtLocation(id: string): NPC[] {
  const location = getLocationById(id);
  return location?.npcs ?? [];
}

/** 获取地点名称（带 fallback） */
export function getLocationName(id: string): string {
  return getLocationById(id)?.name ?? id;
}

/** 判断是否可以移动到目标位置 */
export function canMoveTo(fromId: string, toId: string): boolean {
  const location = getLocationById(fromId);
  if (!location) return false;
  return location.connections.includes(toId);
}
