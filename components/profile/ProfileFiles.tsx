"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ProfileLinks } from "../cover/ProfileLinks";
import { LABEL_FIELD, LIST_CARD } from "../ui/classes";
import * as profileActions from "@/lib/actions/profile";
import { formatSize } from "@/lib/profile-upload";
import { useStudyNote } from "@/lib/store";
import type { ProfileFile } from "@/lib/types";

const BTN_UPLOAD =
  "inline-block cursor-pointer rounded-mini border border-field bg-white px-12 py-9 text-12 font-semibold text-body hover:bg-hover";

/**
 * 첨부 파일·링크. 증명사진, 지원서에 붙일 링크, 서류 파일을 한곳에 둔다.
 * 포트폴리오·이력서는 링크를 먼저 쓰고, 파일로만 받는 곳에는 Word 파일을 올린다.
 * 링크는 자기소개서 화면 위의 내 링크와 같은 값이다.
 *
 * 파일은 비공개 버킷에 있어서 1시간짜리 서명 주소로 보여 준다(lib/actions/profile.ts).
 */
export function ProfileFiles() {
  const s = useStudyNote();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const photos = s.profileFiles.filter((f) => f.kind === "photo");
  const docs = s.profileFiles.filter((f) => f.kind === "document");

  // 아직 주소를 받지 않은 파일만 묻는다. 경로 목록을 문자열로 묶어 바뀔 때만 다시 묻는다.
  const missing = s.profileFiles.filter((f) => f.path && !urls[f.path]).map((f) => f.path);
  const missingKey = missing.join("|");
  useEffect(() => {
    if (!missingKey) return;
    let alive = true;
    profileActions
      .signProfileFiles(missingKey.split("|"))
      .then((signed) => alive && setUrls((prev) => ({ ...prev, ...signed })))
      .catch((e) => console.error("파일 주소 받기 실패", e));
    return () => {
      alive = false;
    };
  }, [missingKey]);

  const onPick = (kind: ProfileFile["kind"]) => (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // 같은 파일을 다시 골라도 onChange가 오게 비운다.
    e.target.value = "";
    files.forEach((file) => void s.uploadProfileFile(file, kind));
  };

  return (
    <div>
      <h1 className="m-0 text-title font-bold tracking-title">첨부 파일·링크</h1>
      <div className="mt-5 text-13 text-muted">파일 {s.profileFiles.length}개</div>

      <div className="mt-22">
        <div className="mb-7 flex items-center gap-8">
          <span className="text-12 font-semibold text-muted">증명사진</span>
          <label className={`${BTN_UPLOAD} ml-auto`}>
            + 사진 올리기
            <input type="file" accept="image/*" onChange={onPick("photo")} className="hidden" />
          </label>
        </div>
        {photos.length > 0 ? (
          <div className="flex flex-wrap gap-14">
            {photos.map((f) => (
              <div key={f.id} className="w-150">
                <div className="flex h-200 w-150 items-center justify-center overflow-hidden rounded-input border border-line bg-surface">
                  {urls[f.path] ? (
                    // 서명 주소라 next/image의 도메인 설정 없이 그대로 띄운다.
                    <img src={urls[f.path]} alt={f.label} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-12 text-muted">{f.uploading ? "올리는 중" : ""}</span>
                  )}
                </div>
                <input
                  value={f.label}
                  onChange={(e) => s.setProfileFileLabel(f.id, e.target.value)}
                  disabled={f.uploading}
                  aria-label="사진 이름"
                  className="mt-6 w-full rounded-mini border border-transparent px-4 py-4 text-13 font-semibold text-ink outline-none hover:bg-surface focus:border-accent focus:bg-white"
                />
                <div className="flex items-center gap-6 px-4 text-12 text-muted">
                  <span className="min-w-0 flex-1 truncate">{formatSize(f.size)}</span>
                  {!f.uploading && (
                    <button type="button" onClick={() => s.removeProfileFile(f)} className="py-6 font-medium hover:text-rejected">
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-field px-20 py-32 text-center text-135 text-muted">
            증명사진을 올리면 지원서 사진 칸에 그대로 쓴다.
          </div>
        )}
      </div>

      <div className="mt-26">
        <ProfileLinks />
      </div>

      <div className="mt-10">
        <div className="mb-7 flex items-center gap-8">
          <span className="text-12 font-semibold text-muted">서류</span>
          <label className={`${BTN_UPLOAD} ml-auto`}>
            + 파일 올리기
            <input type="file" multiple onChange={onPick("document")} className="hidden" />
          </label>
        </div>
        <div className={`${LIST_CARD} divide-y divide-divider`}>
          {docs.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-x-10 py-4 pr-6 pl-14">
              <input
                value={f.label}
                onChange={(e) => s.setProfileFileLabel(f.id, e.target.value)}
                disabled={f.uploading}
                placeholder="서류 이름"
                aria-label="서류 이름"
                className="min-w-0 flex-[1_1_180px] rounded-mini border border-transparent px-6 py-6 text-135 font-semibold tracking-name text-ink outline-none hover:bg-surface focus:border-accent focus:bg-white"
              />
              <span className="min-w-0 flex-[1_1_160px] truncate text-12 text-muted">
                {f.fileName} · {formatSize(f.size)}
              </span>
              {f.uploading ? (
                <span className="p-10 text-12 text-muted">올리는 중</span>
              ) : (
                <div className="flex shrink-0">
                  {urls[f.path] && (
                    <a href={urls[f.path]} target="_blank" rel="noopener" className="p-10 text-12 font-semibold">
                      열기
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => s.removeProfileFile(f)}
                    className="p-10 text-12 font-medium text-muted hover:text-rejected"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
          {docs.length === 0 && (
            <div className="px-14 py-22 text-center text-125 text-muted">성적증명서, 자격증 사본, 포트폴리오·이력서 Word를 올린다.</div>
          )}
        </div>
        <div className={`${LABEL_FIELD} mt-8 font-medium`}>포트폴리오·이력서는 링크를 먼저 쓰고, 파일로만 받는 곳에는 Word를 낸다.</div>
      </div>
    </div>
  );
}
