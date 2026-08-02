// タイトル文字列からURLスラグを生成する共通ヘルパー。
// 引用符・アポストロフィは削除（what's → whats）、それ以外の記号・ダッシュ類
// （em/enダッシュ含む）・空白は単語区切りとしてハイフンに変換する。
export function slugifyTitle(title: string): string {
  let slug = title.toLowerCase();
  slug = slug.replace(/['"’‘“”]/g, "");
  slug = slug.replace(/[^a-z0-9]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  return slug;
}
