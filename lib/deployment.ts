/**
 * 지금 돌고 있는 배포를 가리키는 값. Vercel이 배포마다 넣어 준다. 로컬(npm run dev)에서는
 * 빈 문자열이고, 그때는 새 배포를 확인하지 않는다.
 *
 * 화면(app/page.tsx)이 그려질 때 이 값을 store에 넘기고, store는 가끔 /api/version에 물어
 * 값이 바뀌었으면(새로 배포됐으면) 저장할 것이 다 나간 뒤 페이지를 새로 불러온다.
 */
export const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "";
