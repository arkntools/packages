import { wrap } from 'comlink';
import { once } from 'es-toolkit';
import type { UnpackWorker } from './worker/unpack';

const getWorker = once(() => {
  const worker = new Worker(new URL('./worker/unpack.js', import.meta.url));
  return wrap<UnpackWorker>(worker);
});

const availableFbs = [
  {
    path: '/',
    list: ['buff_table'],
  },
  {
    path: '/excel/',
    list: [
      'activity_table',
      'audio_data',
      'battle_equip_table',
      'building_data',
      'campaign_table',
      'chapter_table',
      'char_master_table',
      'char_meta_table',
      'char_patch_table',
      'character_table',
      'charm_table',
      'charword_table',
      'checkin_table',
      'climb_tower_table',
      'clue_data',
      'crisis_table',
      'crisis_v2_table',
      'display_meta_table',
      'enemy_handbook_table',
      'favor_table',
      'gacha_table',
      'gamedata_const',
      'handbook_info_table',
      'handbook_team_table',
      'hotupdate_meta_table',
      'init_text',
      'item_table',
      'main_text',
      'medal_table',
      'meta_ui_table',
      'mission_table',
      'open_server_table',
      'replicate_table',
      'retro_table',
      'roguelike_topic_table',
      'sandbox_perm_table',
      'sandbox_table',
      'shop_client_table',
      'skill_table',
      'skin_table',
      'special_operator_table',
      'stage_table',
      'story_review_meta_table',
      'story_review_table',
      'story_table',
      'tip_table',
      'token_table',
      'uniequip_table',
      'zone_table',
    ],
  },
  {
    path: '/battle/',
    list: [
      'cooperate_battle_table',
      'ep_breakbuff_table',
      'extra_battlelog_table',
      'legion_mode_buff_table',
      'level_script_table',
    ],
  },
  {
    path: '/building/',
    list: ['building_local_data'],
  },
  {
    path: '/levels/enemydata/',
    list: ['enemy_database'],
  },
];

const fbsNameMap = Object.fromEntries(
  availableFbs.flatMap(({ path, list }) => list.map(name => [`${path}${name}`, name]))
);

const toUint8Array = async (data: unknown) => {
  return data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : data instanceof Blob
    ? new Uint8Array(await data.arrayBuffer())
    : null;
};

export const getUnpackerName = (container: string) => {
  if (!container.startsWith('dyn/gamedata/')) return;
  const key = container.replace('dyn/gamedata', '').replace(/[0-9a-z]{6}\.bytes$/, '');
  const name = fbsNameMap[key];
  if (name) return name;
  if (key.startsWith('/levels/')) return 'prts___levels';
  if (container.startsWith('dyn/gamedata/excel/') && container.endsWith('.bytes')) return '__decrypt_text_asset__';
};

export const getUnpacker = (container: string) => {
  const name = getUnpackerName(container)!;
  const worker = getWorker();
  return async (data: unknown) => {
    try {
      const bytes = await toUint8Array(data);
      if (!bytes) return data;
      return await worker.unpack(name, bytes);
    } catch (error) {
      console.error(error);
      return data;
    }
  };
};
