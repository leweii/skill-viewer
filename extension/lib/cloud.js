// extension/lib/cloud.js

const CLOUD_API_URL = 'https://skill-viewer.vercel.app';

export async function getCloudAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['cloudAuth'], (result) => {
      resolve(result.cloudAuth || null);
    });
  });
}

export async function setCloudAuth(auth) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ cloudAuth: auth }, resolve);
  });
}

export async function clearCloudAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['cloudAuth'], resolve);
  });
}

export async function cloudSummarize(repo, skillPath, skillName, skillContent, language) {
  const auth = await getCloudAuth();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (auth?.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`;
  }

  const response = await fetch(`${CLOUD_API_URL}/api/summarize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      repo,
      skillPath,
      skillName,
      skillContent,
      language
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 429) {
      return { error: 'quota_exceeded', message: error.message };
    }
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return await response.json();
}

export async function cloudGetUsage() {
  const auth = await getCloudAuth();
  if (!auth?.accessToken) {
    return null;
  }

  const response = await fetch(`${CLOUD_API_URL}/api/usage`, {
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  return await response.json();
}
