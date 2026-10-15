import type { APIRoute } from 'astro';
import { loadWordListsOnce, toWordListData, type WordList } from '../../lib/wordlists';

// 詞表在建置時輸出成靜態 JSON；複習頁只在學習者有訂閱時才載入，不內嵌進每一頁。
export function getStaticPaths() {
  return loadWordListsOnce().map((list) => ({ params: { id: list.id }, props: { list } }));
}

export const GET: APIRoute = ({ props }) => {
  const list: WordList = props.list;
  return new Response(JSON.stringify(toWordListData(list)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
