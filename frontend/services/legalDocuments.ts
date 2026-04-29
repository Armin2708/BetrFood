import AsyncStorage from '@react-native-async-storage/async-storage';

export type LegalDocumentType = 'terms' | 'privacy';

export interface LegalDocumentContent {
  title: string;
  version: string;
  lastUpdated: string;
  content: string;
}

export interface LegalDocumentResult {
  document: LegalDocumentContent;
  source: 'remote' | 'cache' | 'bundled';
}

const LEGAL_CACHE_PREFIX = '@betrfood/legal-document/';

const LEGAL_DOCUMENT_URLS: Record<LegalDocumentType, string> = {
  terms: 'https://raw.githubusercontent.com/Armin2708/BetrFood/main/legal/terms-of-service.json',
  privacy: 'https://raw.githubusercontent.com/Armin2708/BetrFood/main/legal/privacy-policy.json',
};

const FALLBACK_DOCUMENTS: Record<LegalDocumentType, LegalDocumentContent> = {
  terms: {
    title: 'Terms of Service',
    version: '1.0',
    lastUpdated: 'April 29, 2026',
    content: '# Terms of Service\n\nWelcome to BetrFood. These Terms of Service govern your use of the BetrFood app, website, and related services.\n\n## 1. Acceptance of Terms\n\nBy creating an account or using BetrFood, you agree to these Terms of Service and our Privacy Policy.\n\n## 2. Eligibility and Accounts\n\nYou are responsible for maintaining the security of your account and for all activity that happens under it. Please provide accurate information and keep your login credentials private.\n\n## 3. Community Content\n\nYou may post recipes, photos, comments, and other food-related content. By posting content, you confirm that you have the right to share it and that it does not violate the rights of others.\n\n## 4. Acceptable Use\n\nYou agree not to misuse the app, including by posting unlawful, harmful, abusive, misleading, or infringing content, attempting to disrupt the service, or accessing areas you are not authorized to use.\n\n## 5. Health and Nutrition Disclaimer\n\nBetrFood provides food, recipe, and pantry-related information for general informational purposes only. It is not medical advice, nutritional counseling, or a substitute for professional guidance.\n\n## 6. Intellectual Property\n\nBetrFood and its branding, software, and design are owned by BetrFood or its licensors. You retain ownership of the content you create, but you grant BetrFood a non-exclusive license to host, display, and distribute that content within the service.\n\n## 7. Termination\n\nWe may suspend or terminate access to the service if these Terms are violated or if use of the service presents legal, security, or operational risk.\n\n## 8. Changes to the Service or Terms\n\nWe may update the app or these Terms from time to time. Continued use of the service after updates means you accept the revised Terms.\n\n## 9. Contact\n\nIf you have questions about these Terms, please contact the BetrFood team through the support channels listed in the app.',
  },
  privacy: {
    title: 'Privacy Policy',
    version: '1.0',
    lastUpdated: 'April 29, 2026',
    content: '# Privacy Policy\n\nThis Privacy Policy explains how BetrFood collects, uses, stores, and protects your information when you use the app.\n\n## 1. Information We Collect\n\nWe may collect information you provide directly, including your account details, profile information, dietary preferences, pantry entries, uploaded content, and messages you send through the app.\n\n## 2. How We Use Information\n\nWe use your information to operate the app, personalize content, improve recommendations, support pantry and AI features, maintain account security, and communicate important product updates.\n\n## 3. User Content\n\nContent you upload, such as posts, recipe information, or pantry photos, may be stored and processed to provide app functionality and improve your experience.\n\n## 4. AI and Personalization\n\nSome features use your preferences, pantry data, and app interactions to generate recommendations or AI responses. These features are intended to improve usability and relevance.\n\n## 5. Sharing and Disclosure\n\nWe do not sell your personal information. We may share data with service providers that help us operate the app, or when required by law, safety concerns, or to enforce our policies.\n\n## 6. Data Security\n\nWe use reasonable administrative and technical safeguards to protect your information. No system can guarantee absolute security, so please use strong credentials and protect your account access.\n\n## 7. Your Choices\n\nYou may update parts of your profile and settings within the app. Depending on product capabilities and applicable law, you may also request account deletion or changes to your stored information.\n\n## 8. Changes to This Policy\n\nWe may revise this Privacy Policy from time to time. The latest version and last updated date will always be shown in the app.\n\n## 9. Contact\n\nIf you have privacy questions, concerns, or requests, please contact the BetrFood team using the support options available in the app.',
  },
};

function getCacheKey(type: LegalDocumentType) {
  return `${LEGAL_CACHE_PREFIX}${type}`;
}

export async function fetchLegalDocument(type: LegalDocumentType): Promise<LegalDocumentResult> {
  const url = LEGAL_DOCUMENT_URLS[type];

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch legal document (${response.status})`);
    }

    const document = (await response.json()) as LegalDocumentContent;
    await AsyncStorage.setItem(getCacheKey(type), JSON.stringify(document));

    return { document, source: 'remote' };
  } catch {
    const cached = await AsyncStorage.getItem(getCacheKey(type));
    if (cached) {
      return {
        document: JSON.parse(cached) as LegalDocumentContent,
        source: 'cache',
      };
    }

    return {
      document: FALLBACK_DOCUMENTS[type],
      source: 'bundled',
    };
  }
}
