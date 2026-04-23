/**
 * Static FAQ content for the Help & Support screen.
 *
 * Content is shipped in-app and versioned with the app release. Updating any
 * answer requires a new release. A future CMS integration can replace this
 * module without changing consumers as long as the exported shape holds.
 */

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  icon: string; // Ionicons name
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'account',
    title: 'Account',
    icon: 'person-circle-outline',
    items: [
      {
        id: 'account-create',
        question: 'How do I create a BetrFood account?',
        answer:
          'Tap "Sign Up" on the welcome screen and register with your email, Apple, or Google account. You can edit your display name and profile photo any time from the Profile tab.',
      },
      {
        id: 'account-reset-password',
        question: 'How do I reset my password?',
        answer:
          'From the login screen, tap "Forgot password?" and enter the email linked to your account. We will send a password reset link within a few minutes — check your spam folder if you do not see it.',
      },
      {
        id: 'account-change-email',
        question: 'Can I change the email address on my account?',
        answer:
          'Yes. Go to Profile > Settings > Account and tap your email address to update it. You will need to verify the new email before the change takes effect.',
      },
      {
        id: 'account-delete',
        question: 'How do I delete my account?',
        answer:
          'Open Profile > Settings and scroll to the Account section, then tap "Delete Account" and confirm. Deletion is permanent and removes your posts, comments, follows, and saved data.',
      },
    ],
  },
  {
    id: 'pantry',
    title: 'Pantry',
    icon: 'basket-outline',
    items: [
      {
        id: 'pantry-add',
        question: 'How do I add an item to my pantry?',
        answer:
          'Open the Pantry tab and tap the plus button. You can scan a barcode, search the food database, or add a custom item with your own name and quantity.',
      },
      {
        id: 'pantry-expiry',
        question: 'Why is an item showing as expired?',
        answer:
          'BetrFood tracks expiry dates you enter manually or from barcode scans. If the date looks wrong, tap the item and edit the "Expires on" field to correct it.',
      },
      {
        id: 'pantry-recipes',
        question: 'How does "Cook with what I have" work?',
        answer:
          'We match recipes against the ingredients currently in your pantry, prioritising items nearing expiry. Recipes that require only a couple of extra ingredients are also suggested and labelled accordingly.',
      },
    ],
  },
  {
    id: 'posting',
    title: 'Posting',
    icon: 'create-outline',
    items: [
      {
        id: 'posting-create',
        question: 'How do I share a recipe or food photo?',
        answer:
          'Tap the plus button in the bottom tab bar, choose a photo or video, then add a caption, tags, and optional recipe steps. Posts are visible to your followers immediately after publishing.',
      },
      {
        id: 'posting-edit',
        question: 'Can I edit a post after publishing?',
        answer:
          'You can edit the caption, tags, and recipe details of any post you own. Open the post, tap the menu icon in the top right, and choose "Edit". The media itself cannot be changed after publishing.',
      },
      {
        id: 'posting-delete',
        question: 'How do I delete one of my posts?',
        answer:
          'Open the post, tap the menu icon, and choose "Delete". Deletion is permanent and will also remove the post\'s likes and comments.',
      },
      {
        id: 'posting-hashtags',
        question: 'How do hashtags work?',
        answer:
          'Hashtags help others discover your post. Type # followed by a keyword in your caption (for example, #mealprep). Tap any hashtag to see trending posts using the same tag.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications-outline',
    items: [
      {
        id: 'notifications-disable-all',
        question: 'How do I turn off all push notifications?',
        answer:
          'Go to Profile > Settings > Notifications and toggle "Push notifications" off. This pauses all notification types from BetrFood without affecting your account.',
      },
      {
        id: 'notifications-types',
        question: 'Can I choose which notifications I get?',
        answer:
          'Yes — under Profile > Settings > Notifications you can individually enable or disable likes, comments, follows, mentions, and recipe reminders.',
      },
      {
        id: 'notifications-not-arriving',
        question: 'Why am I not receiving notifications?',
        answer:
          'Check that notifications are enabled both in BetrFood (Settings > Notifications) and in your device\'s system settings for BetrFood. Do Not Disturb and focus modes can also silence them.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    icon: 'lock-closed-outline',
    items: [
      {
        id: 'privacy-profile',
        question: 'How do I make my profile private?',
        answer:
          'Go to Profile > Settings > Privacy and turn off "Public Profile". Only accounts you approve as followers will be able to see your posts and activity.',
      },
      {
        id: 'privacy-block',
        question: 'What happens when I block someone?',
        answer:
          'Blocked users cannot see your profile, posts, or comments, and cannot follow or message you. They are not notified that you blocked them.',
      },
      {
        id: 'privacy-data',
        question: 'What data does BetrFood collect about me?',
        answer:
          'We collect the content you create, your pantry and recipe activity, and basic device diagnostics. Full details are in our Privacy Policy, linked from Settings > Legal.',
      },
    ],
  },
  {
    id: 'recipes',
    title: 'Recipes',
    icon: 'restaurant-outline',
    items: [
      {
        id: 'recipes-save',
        question: 'How do I save a recipe for later?',
        answer:
          'Tap the bookmark icon on any recipe to save it. Saved recipes appear in Profile > Collections, where you can organise them into folders such as "Weeknight" or "Desserts".',
      },
      {
        id: 'recipes-scale',
        question: 'Can I scale a recipe up or down?',
        answer:
          'Open the recipe and tap the serving count near the top. Adjust it to the number of servings you need — ingredient quantities update automatically.',
      },
      {
        id: 'recipes-missing-steps',
        question: 'A recipe I posted is missing steps after editing — what happened?',
        answer:
          'Recipe steps are saved separately from the caption. If steps appear blank after an edit, reopen the editor, re-add the steps, and save again. If the problem persists, contact support.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'construct-outline',
    items: [
      {
        id: 'trouble-crash',
        question: 'The app keeps crashing — what should I try first?',
        answer:
          'Force-quit BetrFood and reopen it, then make sure you are on the latest version from the App Store or Play Store. If it still crashes, restart your device and try again.',
      },
      {
        id: 'trouble-upload',
        question: 'My photo or video upload keeps failing.',
        answer:
          'Uploads need a stable connection. Switch between Wi-Fi and cellular, make sure the file is under 100MB, and retry. If the issue continues, try uploading a smaller version of the media.',
      },
      {
        id: 'trouble-contact',
        question: 'Something else is wrong — how do I contact support?',
        answer:
          'Email support@betrfood.com with a short description of the issue and, if possible, a screenshot. Please include your app version (shown in Settings > App Information) so we can help faster.',
      },
    ],
  },
];

export function getAllFaqItems(): Array<FaqItem & { categoryId: string; categoryTitle: string }> {
  return FAQ_CATEGORIES.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      categoryId: category.id,
      categoryTitle: category.title,
    }))
  );
}
