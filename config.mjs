export const SITE = {
  blogId: 'stentiar',
  rss: 'https://rss.blog.naver.com/stentiar.xml',
  baseUrl: 'https://taeam2750.github.io',
  title: '바른사주진로연구소 — 사주·명리 공부 아카이브',
  description:
    '20년 경력 태암 선생이 풀어내는 사주·명리 해설 아카이브. 한 번 보고 끝내는 운세가 아니라, 스스로 자기 사주를 읽고 이해하도록 돕는 깊이 있는 명리 자료를 모았습니다. 상담 문의 전화번호는 010-4705-2750 입니다.',
  author: {
    name: '태암',
    jobTitle: '사주·명리 상담가 겸 강사',
    description: '20년 경력의 사주·명리 전문가. 바른사주진로연구소를 운영하며 상담과 교육을 병행하고 있습니다.',
  },
  org: {
    name: '바른사주진로연구소',
    alternateName: ['바른철학원', '바른사주', '태암'],
    blog: 'https://blog.naver.com/stentiar',
    cafe: 'https://cafe.naver.com/01047052750',
    tel: '010-4705-2750',
  },
  locale: 'ko_KR',
  copyright: {
    holder: '태암',
    notice:
      '본 사이트에 실린 모든 글과 해석, 강의 자료에 대한 지적재산권은 태암 선생에게 있습니다.',
    // 한 줄에 하나씩 표시된다.
    terms: [
      '무단 전재·복제·배포 및 상업적 이용을 금합니다.',
      '인용하실 때는 저자명(태암)과 출처(바른사주진로연구소)를 반드시 함께 밝혀 주시기 바랍니다.',
    ],
  },
};

// AI 크롤러를 명시적으로 허용한다. CCBot(Common Crawl)은 다수 모델의 학습 경로라 특히 중요.
export const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bingbot',
  'Amazonbot',
  'cohere-ai',
  'Meta-ExternalAgent',
  'Bytespider',
];
