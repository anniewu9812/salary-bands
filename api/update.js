// api/update.js
// Vercel Serverless Function — 透過 GitHub API 更新 data.json
// 環境變數需在 Vercel 後台設定：
//   GITHUB_TOKEN   → 你的 Personal Access Token
//   GITHUB_OWNER   → 你的 GitHub 帳號名稱
//   GITHUB_REPO    → 你的 repo 名稱
//   ADMIN_PASSWORD → 管理員密碼（你自訂）

export default async function handler(req, res) {
  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminPassword, rows } = req.body;

  // 1. 驗證管理員密碼
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密碼錯誤' });
  }

  // 2. 驗證資料格式
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: '資料格式錯誤' });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  const path  = 'data.json';
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    // 3. 取得目前檔案的 SHA（GitHub API 更新檔案需要 SHA）
    const getRes = await fetch(apiBase, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      }
    });

    if (!getRes.ok) {
      const err = await getRes.json();
      return res.status(500).json({ error: '無法取得檔案資訊', detail: err.message });
    }

    const fileInfo = await getRes.json();
    const sha = fileInfo.sha;

    // 4. 準備新內容（Base64 編碼）
    const newContent = JSON.stringify({ rows }, null, 2);
    const encoded = Buffer.from(newContent, 'utf-8').toString('base64');

    // 5. 推送更新
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore: update salary data [${new Date().toISOString()}]`,
        content: encoded,
        sha: sha,
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: '推送 GitHub 失敗', detail: err.message });
    }

    return res.status(200).json({ success: true, message: '資料已成功更新並推送至 GitHub' });

  } catch (err) {
    return res.status(500).json({ error: '伺服器錯誤', detail: err.message });
  }
}
