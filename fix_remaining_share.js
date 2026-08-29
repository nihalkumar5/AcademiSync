const fs = require('fs');

// 1. shareUtils.ts
const shareUtilsContent = `import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}

export async function shareLink({ title, text, url, dialogTitle = 'Share via' }: ShareOptions): Promise<'shared' | 'copied' | 'error'> {
  // 1. Capacitor Native Share Sheet
  try {
    const isCap = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || (window as any).Capacitor?.isNativePlatform?.());
    if (isCap) {
      await Share.share({
        title,
        text: text ? \`\${text} \${url}\` : url,
        url,
        dialogTitle,
      });
      return 'shared';
    }
  } catch (e: any) {
    if (e?.message?.includes('canceled') || e?.message?.includes('dismissed') || e?.name === 'AbortError') {
      return 'shared';
    }
    console.warn('Capacitor Share failed, attempting fallback:', e);
  }

  // 2. Web Share API (Chrome / Mobile browsers / Web)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: text ? \`\${text} \${url}\` : url,
        url,
      });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError' || e?.message?.includes('canceled')) {
        return 'shared';
      }
      console.warn('Navigator share failed, falling back to clipboard:', e);
    }
  }

  // 3. Fallback: Copy to Clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  }

  return 'error';
}
`;
fs.writeFileSync('lib/shareUtils.ts', shareUtilsContent);
console.log('Updated lib/shareUtils.ts');

// 2. BatchMembersModal.tsx
let batchModal = fs.readFileSync('components/batch/BatchMembersModal.tsx', 'utf8');
if (!batchModal.includes('shareLink')) {
  batchModal = `'use client';\n\nimport { shareLink } from '@/lib/shareUtils';\n` + batchModal.replace(/['"]use client['"];?\n*/, '');
}
batchModal = batchModal.replace(
  /const handleCopyInvite = \(\) => {[\s\S]*?};/,
  `const handleCopyInvite = async () => {
    const inviteUrl = \`\${window.location.origin}/?invite=\${batchKey}\`;
    const res = await shareLink({
      title: 'Join Batch Timetable',
      text: 'Join our class batch on AcademiSync to sync timetable and schedules!',
      url: inviteUrl,
      dialogTitle: 'Invite Batchmate',
    });
    if (res === 'copied') {
      setCopiedLink(true);
      showToast('Link Copied', 'Batch invite link copied to clipboard.', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };`
);
fs.writeFileSync('components/batch/BatchMembersModal.tsx', batchModal);
console.log('Updated BatchMembersModal.tsx');

// 3. SettingsView.tsx
let settings = fs.readFileSync('components/settings/SettingsView.tsx', 'utf8');
settings = settings.replace(
  `                    const code = await shareTimetableWithBatch();\n                    const link = \`\${window.location.origin}/?invite=\${code}\`;\n                    navigator.clipboard.writeText(link);\n                    showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');`,
  `                    const code = await shareTimetableWithBatch();\n                    const link = \`\${window.location.origin}/?invite=\${code}\`;\n                    const res = await shareLink({ title: 'Join Batch Timetable', text: 'Join our class batch on AcademiSync!', url: link, dialogTitle: 'Invite Classmates' });\n                    if (res === 'copied') showToast('Invite Link Copied', 'Share this link with your classmates!', 'success');`
);
fs.writeFileSync('components/settings/SettingsView.tsx', settings);
console.log('Updated SettingsView.tsx');
