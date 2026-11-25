import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { createClub, uploadClubImage } from "../../services/clubService";
import ImageFilePicker from "../../components/common/ImageFilePicker";
import { trackEvent } from "../../utils/analytics";

const INITIAL_FORM = {
  clubName: "",
  category: "",
  shortDescription: "",
  detailDescription: "",
  regularMeetingTime: "",
  activityLocation: "",
  contact: "",
};

export default function ClubCreationPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));

    setApiError("");

  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.clubName.trim()) {
      nextErrors.clubName = "동아리명을 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      clubName: form.clubName.trim(),
      category: form.category.trim(),
      shortDescription: form.shortDescription.trim(),
      detailDescription: form.detailDescription.trim(),
      imageUrl: "",
      regularMeetingTime: form.regularMeetingTime.trim(),
      activityLocation: form.activityLocation.trim(),
      contact: form.contact.trim(),
    };

    setSubmitting(true);
    setApiError("");

    try {
      const createdClub = await createClub(payload);
      trackEvent("club_created");

      let imageUploadFailed = false;
      if (imageFile) {
        try {
          await uploadClubImage(createdClub.id, imageFile);
        } catch (error) {
          console.error(error);
          imageUploadFailed = true;
        }
      }

      alert(
        imageUploadFailed
          ? "동아리가 생성되었지만 대표 이미지 업로드에 실패했습니다. 동아리 관리에서 이미지를 다시 등록해주세요."
          : "동아리가 생성되었습니다.",
      );

      navigate(`/club/main/${createdClub.id}`);
    } catch (error) {
      console.error(error);

      setApiError(
        error.response?.data?.message ||
          "동아리 생성에 실패했습니다. 입력 내용을 확인해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    {
      key: "clubName",
      label: "동아리명",
      placeholder: "예) SKHU 개발 동아리",
      required: true,
    },
    {
      key: "category",
      label: "카테고리",
      placeholder: "예) 학술, 봉사, 문화, 체육",
    },
    {
      key: "shortDescription",
      label: "한 줄 소개",
      placeholder: "동아리를 한 문장으로 소개해주세요.",
    },
    {
      key: "regularMeetingTime",
      label: "정기 모임 시간",
      placeholder: "예) 매주 목요일 오후 6시",
    },
    {
      key: "activityLocation",
      label: "활동 장소",
      placeholder: "예) 미가엘관 M301",
    },
    {
      key: "contact",
      label: "연락처",
      placeholder: "이메일, 오픈채팅 링크 등",
    },
  ];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-theme-subtle px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-theme-accent text-blue-600 dark:text-theme-link">
              <Plus size={25} strokeWidth={2.2} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text sm:text-3xl">
                동아리 생성
              </h1>

              <p className="mt-1.5 text-sm text-gray-500 dark:text-theme-muted">
                새로운 동아리를 생성하기 위한 정보를 입력해주세요.
              </p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-gray-100 dark:border-theme-border bg-white dark:bg-theme-surface shadow-sm dark:shadow-theme-shadow">
          <div className="border-b border-gray-100 dark:border-theme-border px-6 py-5 sm:px-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-theme-text">동아리 정보</h2>

            <p className="mt-1 text-xs text-gray-400 dark:text-theme-muted">
              입력한 정보로 새로운 동아리가 즉시 생성됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
              {apiError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg px-4 py-3 text-sm text-red-600 dark:text-theme-danger">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />

                  <span>{apiError}</span>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                {fields.map((field) => (
                  <label
                    key={field.key}
                    className={
                      field.key === "shortDescription" ? "sm:col-span-2" : ""
                    }
                  >
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-theme-secondary">
                      {field.label}

                      {field.required && (
                        <span className="ml-1 text-red-400 dark:text-theme-danger">*</span>
                      )}
                    </span>

                    <input
                      type="text"
                      value={form[field.key]}
                      onChange={(event) =>
                        setField(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors ${
                        errors[field.key]
                          ? "border-red-300 dark:border-theme-danger-border bg-red-50 dark:bg-theme-danger-bg"
                          : "border-gray-200 dark:border-theme-border focus:border-blue-400 dark:focus:border-theme-focus"
                      }`}
                    />

                    {errors[field.key] && (
                      <span className="mt-1.5 block text-xs text-red-500 dark:text-theme-danger">
                        {errors[field.key]}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-theme-secondary">
                  상세 소개
                </span>

                <textarea
                  value={form.detailDescription}
                  onChange={(event) =>
                    setField("detailDescription", event.target.value)
                  }
                  placeholder="주요 활동, 운영 방식, 모집 대상 등을 자세히 작성해주세요."
                  rows={6}
                  className="w-full resize-none rounded-lg border border-gray-200 dark:border-theme-border px-4 py-3 text-sm leading-6 outline-none transition-colors focus:border-blue-400 dark:focus:border-theme-focus"
                />
              </label>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-theme-secondary">
                  대표 이미지
                </p>
                <ImageFilePicker
                  file={imageFile}
                  onChange={setImageFile}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 dark:border-theme-border px-6 py-5 sm:px-8">
              <button
                type="submit"
                disabled={submitting}
                className="flex min-w-36 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 dark:bg-theme-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 dark:hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}

                {submitting ? "생성 중..." : "동아리 생성하기"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
