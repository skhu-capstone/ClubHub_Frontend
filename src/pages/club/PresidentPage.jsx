import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ImagePlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClubDetail,
  getClubMembers,
  uploadClubImage,
} from "../../services/clubService";
import { useAuth } from "../../context/AuthContext";
import {
  approveClubJoinRequest,
  getClubJoinRequests,
  rejectClubJoinRequest,
  removeClubMember,
  transferClubPresident,
  updateClubInfo,
  updateClubMemberRole,
} from "../../services/presidentService";

const EMPTY_LIST = [];

const CLUB_INFO_LIMITS = {
  clubName: 50,
  category: 30,
  shortDescription: 100,
  detailDescription: 1000,
  regularMeetingTime: 100,
  activityLocation: 100,
  contact: 100,
};
const ALLOWED_CLUB_IMAGE_TYPES = ["image/png", "image/jpeg"];
const MAX_CLUB_IMAGE_SIZE = 20 * 1024 * 1024;

const managementTabs = [
  { key: "info", label: "동아리 정보" },
  { key: "applicants", label: "가입 신청자" },
  { key: "members", label: "멤버 관리" },
];

const parseStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

export default function PresidentPage() {
  const navigate = useNavigate();
  const { clubId } = useParams();
  const targetClubId = Number(clubId);
  const isValidClubId = Number.isInteger(targetClubId) && targetClubId > 0;
  const queryClient = useQueryClient();
  const { user: authUser, loading: authLoading } = useAuth();
  const accessToken = localStorage.getItem("accessToken");
  const isAuthenticated = !!authUser && !!accessToken;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = managementTabs.some((tab) => tab.key === requestedTab) ? requestedTab : "info";
  const setActiveTab = (tab) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous);
    next.set("tab", tab);
    return next;
  });
  const [removedApplicantIds, setRemovedApplicantIds] = useState([]);
  const [members, setMembers] = useState([]);
  const [clubImageFile, setClubImageFile] = useState(null);
  const [clubImagePreview, setClubImagePreview] = useState("");
  const [hasClubImageError, setHasClubImageError] = useState(false);
  const [clubInfo, setClubInfo] = useState({
    clubName: "",
    category: "",
    shortDescription: "",
    detailDescription: "",
    imageUrl: "",
    regularMeetingTime: "",
    activityLocation: "",
    contact: "",
  });
  const [confirmAction, setConfirmAction] = useState(null);
  const [expandedApplicantIds, setExpandedApplicantIds] = useState([]);
  const [actionMessage, setActionMessage] = useState(null);
  const loginUser = authUser ?? parseStoredUser();
  const loginUserId = Number(loginUser?.userId ?? loginUser?.id);

  const president = useMemo(
    () => members.find((member) => member.role === "PRESIDENT"),
    [members]
  );
  const currentUser = useMemo(
    () =>
      members.find((member) => Number(member.userId ?? member.id) === loginUserId),
    [loginUserId, members]
  );
  const isCurrentUserPresident = currentUser?.role === "PRESIDENT";

  const {
    data: joinRequests = EMPTY_LIST,
    isLoading: isJoinRequestsLoading,
    isError: isJoinRequestsError,
  } = useQuery({
    queryKey: ["clubJoinRequests", targetClubId],
    queryFn: () => getClubJoinRequests(targetClubId),
    enabled: isAuthenticated && isValidClubId,
  });

  const {
    data: clubMembers = EMPTY_LIST,
    isLoading: isMembersLoading,
    isError: isMembersError,
  } = useQuery({
    queryKey: ["clubMembers", targetClubId],
    queryFn: () => getClubMembers(targetClubId),
    enabled: isAuthenticated && isValidClubId,
  });

  const {
    data: clubDetail,
    isLoading: isClubDetailLoading,
    isError: isClubDetailError,
  } = useQuery({
    queryKey: ["clubDetail", targetClubId],
    queryFn: () => getClubDetail(targetClubId),
    enabled: isAuthenticated && isValidClubId,
  });

  useEffect(() => {
    setMembers(clubMembers);
  }, [clubMembers]);

  useEffect(() => {
    if (!clubDetail) return;

    setClubInfo({
      clubName: clubDetail.clubName ?? "",
      category: clubDetail.category ?? "",
      shortDescription: clubDetail.shortDescription ?? "",
      detailDescription: clubDetail.detailDescription ?? "",
      imageUrl: clubDetail.imageUrl ?? "",
      regularMeetingTime: clubDetail.regularMeetingTime ?? "",
      activityLocation: clubDetail.activityLocation ?? "",
      contact: clubDetail.contact ?? "",
    });
    setClubImageFile(null);
    setClubImagePreview("");
    setHasClubImageError(false);
  }, [clubDetail]);

  const applicants = useMemo(
    () =>
      joinRequests
        .filter((request) => !removedApplicantIds.includes(request.userId))
        .map((request) => ({
          id: request.userId,
          name: request.name ?? "",
          requestedAt: request.requestedAt,
          message: request.joinMessage ?? "",
          status: request.clubJoinStatus,
        })),
    [joinRequests, removedApplicantIds]
  );

  const transferPresidentMutation = useMutation({
    mutationFn: transferClubPresident,
    onSuccess: (result) => {
      setMembers((prev) =>
        prev.map((member) => {
          if (Number(member.userId ?? member.id) === Number(result.newPresidentUserId)) {
            return { ...member, role: "PRESIDENT" };
          }
          if (
            Number(member.userId ?? member.id) ===
            Number(result.previousPresidentUserId)
          ) {
            return { ...member, role: result.previousPresidentRole ?? "MEMBER" };
          }
          return member;
        })
      );
      setConfirmAction(null);
      setActionMessage({ type: "success", text: "대표 권한이 이전되었습니다." });
    },
    onError: (error) => {
      console.error(error);
      setActionMessage({ type: "error", text: error.response?.data?.message || "대표 권한 이전에 실패했습니다." });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: updateClubMemberRole,
    onSuccess: (result) => {
      setMembers((prev) =>
        prev.map((member) =>
          Number(member.userId ?? member.id) === Number(result.userId)
            ? { ...member, role: result.role }
            : member
        )
      );
      setActionMessage({ type: "success", text: "멤버 역할이 변경되었습니다." });
    },
    onError: (error) => {
      console.error(error);
      setActionMessage({ type: "error", text: error.response?.data?.message || "멤버 역할 변경에 실패했습니다." });
    },
  });

  const updateClubInfoMutation = useMutation({
    mutationFn: async ({ clubId, clubInfo, imageFile }) => {
      let nextClubInfo = clubInfo;
      let imageUploadFailed = false;

      if (imageFile) {
        try {
          const uploadedImageUrl = await uploadClubImage(clubId, imageFile);

          if (uploadedImageUrl) {
            nextClubInfo = {
              ...clubInfo,
              imageUrl: uploadedImageUrl,
            };
          }
        } catch (error) {
          console.error(error);
          imageUploadFailed = true;
        }
      }

      const updatedClubInfo = await updateClubInfo({
        clubId,
        clubInfo: nextClubInfo,
      });

      return {
        clubInfo: updatedClubInfo,
        imageUploadFailed,
      };
    },
    onSuccess: async (result, variables) => {
      const updatedClubInfo = result.clubInfo;

      setClubInfo({
        clubName: updatedClubInfo.clubName ?? "",
        category: updatedClubInfo.category ?? "",
        shortDescription: updatedClubInfo.shortDescription ?? "",
        detailDescription: updatedClubInfo.detailDescription ?? "",
        imageUrl: updatedClubInfo.imageUrl ?? "",
        regularMeetingTime: updatedClubInfo.regularMeetingTime ?? "",
        activityLocation: updatedClubInfo.activityLocation ?? "",
        contact: updatedClubInfo.contact ?? "",
      });
      setClubImageFile(null);
      setClubImagePreview("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["clubDetail", variables.clubId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["myClubs"],
        }),
      ]);
      setActionMessage({
        type: result.imageUploadFailed ? "error" : "success",
        text: result.imageUploadFailed
          ? "동아리 정보는 수정되었지만 이미지 업로드에 실패했습니다."
          : "동아리 정보가 수정되었습니다.",
      });
    },
    onError: (error) => {
      console.error(error);
      setActionMessage({ type: "error", text: error.response?.data?.message || "동아리 정보 수정에 실패했습니다." });
    },
  });

  const approveJoinRequestMutation = useMutation({
    mutationFn: approveClubJoinRequest,
    onSuccess: async (result, variables) => {
      setRemovedApplicantIds((prev) => [...prev, variables.applicantUserId]);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["clubJoinRequests", variables.clubId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["clubMembers", variables.clubId],
        }),
      ]);
      setActionMessage({ type: "success", text: "가입 신청을 승인했습니다." });
    },
    onError: (error) => {
      console.error(error);
      setActionMessage({ type: "error", text: error.response?.data?.message || "가입 신청 승인에 실패했습니다." });
    },
  });

  const rejectJoinRequestMutation = useMutation({
    mutationFn: rejectClubJoinRequest,
    onSuccess: async (result, variables) => {
      setRemovedApplicantIds((prev) => [...prev, variables.applicantUserId]);
      await queryClient.invalidateQueries({
        queryKey: ["clubJoinRequests", variables.clubId],
      });
      setActionMessage({ type: "success", text: "가입 신청을 거절했습니다." });
    },
    onError: (error) => {
      console.error(error);
      setActionMessage({ type: "error", text: error.response?.data?.message || "가입 신청 거절에 실패했습니다." });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeClubMember,
    onSuccess: (result, variables) => {
      setMembers((prev) =>
        prev.filter(
          (member) =>
            Number(member.userId ?? member.id) !== Number(variables.targetUserId)
        )
      );
      setConfirmAction(null);
      setActionMessage({ type: "success", text: "멤버를 내보냈습니다." });
    },
    onError: (error) => {
      console.error(error);
      setActionMessage({ type: "error", text: error.response?.data?.message || "멤버 내보내기에 실패했습니다." });
    },
  });

  const isAnyMutationPending =
    transferPresidentMutation.isPending ||
    updateMemberRoleMutation.isPending ||
    updateClubInfoMutation.isPending ||
    approveJoinRequestMutation.isPending ||
    rejectJoinRequestMutation.isPending ||
    removeMemberMutation.isPending;

	  const handleApprove = (applicant) => {
    if (!isAuthenticated) {
      setActionMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }

    if (!isCurrentUserPresident) {
      setActionMessage({ type: "error", text: "대표만 가입 신청을 승인할 수 있습니다." });
      return;
    }

    if (!isValidClubId) {
      setActionMessage({ type: "error", text: "동아리 정보를 찾을 수 없습니다." });
      return;
    }

    approveJoinRequestMutation.mutate({
      clubId: targetClubId,
      applicantUserId: applicant.id,
    });
  };

	  const handleReject = (applicantId) => {
    if (!isAuthenticated) {
      setActionMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }

    if (!isCurrentUserPresident) {
      setActionMessage({ type: "error", text: "대표만 가입 신청을 거절할 수 있습니다." });
      return;
    }

    if (!isValidClubId) {
      setActionMessage({ type: "error", text: "동아리 정보를 찾을 수 없습니다." });
      return;
    }

    rejectJoinRequestMutation.mutate({
      clubId: targetClubId,
      applicantUserId: applicantId,
    });
  };

	  const handleRoleChange = (targetUserId, nextRole) => {
    if (!isAuthenticated) {
      setActionMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }

    if (!isCurrentUserPresident) {
      setActionMessage({ type: "error", text: "대표만 멤버 역할을 변경할 수 있습니다." });
      return;
    }

    const targetMember = members.find(
      (member) => Number(member.userId ?? member.id) === Number(targetUserId)
    );
    if (!targetMember || targetMember.role === nextRole) return;

    if (nextRole === "PRESIDENT") {
      if (!isCurrentUserPresident) {
        setActionMessage({ type: "error", text: "대표만 대표 권한을 이전할 수 있습니다." });
        return;
      }

      setConfirmAction({
        title: "대표 권한을 이전할까요?",
        description:
          "대표 권한을 이전하면 현재 대표는 일반 부원으로 변경됩니다.",
        confirmText: "이전하기",
        onConfirm: () => transferPresident(targetUserId),
      });
      return;
    }

    if (!isValidClubId) {
      setActionMessage({ type: "error", text: "동아리 정보를 찾을 수 없습니다." });
      return;
    }

    updateMemberRoleMutation.mutate({
      clubId: targetClubId,
      targetUserId,
      role: nextRole,
    });
  };

	  const transferPresident = (targetUserId) => {
    if (!isAuthenticated) {
      setActionMessage({ type: "error", text: "로그인이 필요합니다." });
      setConfirmAction(null);
      return;
    }

    if (!isCurrentUserPresident) {
      setActionMessage({ type: "error", text: "대표만 대표 권한을 이전할 수 있습니다." });
      setConfirmAction(null);
      return;
    }

    if (!isValidClubId) {
      setActionMessage({ type: "error", text: "동아리 정보를 찾을 수 없습니다." });
      return;
    }

    transferPresidentMutation.mutate({
      clubId: targetClubId,
      newPresidentUserId: targetUserId,
    });
  };

	  const requestRemoveMember = (member) => {
    if (!isAuthenticated) return;
    if (!isCurrentUserPresident) {
      setActionMessage({ type: "error", text: "대표만 멤버를 내보낼 수 있습니다." });
      return;
    }
    if (Number(member.userId ?? member.id) === loginUserId) return;
    if (member.role === "PRESIDENT") return;

    setConfirmAction({
      title: "멤버를 내보낼까요?",
      description: `${member.name}님을 동아리에서 내보냅니다. 이 작업은 되돌릴 수 없습니다.`,
      confirmText: "내보내기",
      danger: true,
      onConfirm: () => removeMember(member.userId ?? member.id),
    });
  };

	  const removeMember = (targetUserId) => {
    if (!isAuthenticated) {
      setActionMessage({ type: "error", text: "로그인이 필요합니다." });
      setConfirmAction(null);
      return;
    }

    if (!isCurrentUserPresident) {
      setActionMessage({ type: "error", text: "대표만 멤버를 내보낼 수 있습니다." });
      setConfirmAction(null);
      return;
    }

    const targetMember = members.find(
      (member) => Number(member.userId ?? member.id) === Number(targetUserId)
    );
    if (!targetMember || targetMember.role === "PRESIDENT") return;
    if (Number(targetUserId) === loginUserId) return;

    if (!isValidClubId) {
      setActionMessage({ type: "error", text: "동아리 정보를 찾을 수 없습니다." });
      return;
    }

    removeMemberMutation.mutate({
      clubId: targetClubId,
      targetUserId,
    });
  };

  const handleClubInfoChange = (field, value) => {
    setClubInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClubImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;
  
    if (!file) {
      setClubImageFile(null);
      setClubImagePreview("");
      setHasClubImageError(false);
      return;
    }

    if (!ALLOWED_CLUB_IMAGE_TYPES.includes(file.type)) {
      setActionMessage({ type: "error", text: "PNG 또는 JPG 이미지만 업로드할 수 있습니다." });
      event.target.value = "";
      setClubImageFile(null);
      setClubImagePreview("");
      setHasClubImageError(false);
      return;
    }

    if (file.size > MAX_CLUB_IMAGE_SIZE) {
      setActionMessage({ type: "error", text: "이미지는 20MB 이하만 업로드할 수 있습니다." });
      event.target.value = "";
      setClubImageFile(null);
      setClubImagePreview("");
      setHasClubImageError(false);
      return;
    }

    setClubImageFile(file);
    setActionMessage(null);
    setHasClubImageError(false);

    const reader = new FileReader();
    reader.onload = () => setClubImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

	  const handleClubInfoSubmit = () => {
    if (!isAuthenticated) {
      setActionMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }

    if (!isValidClubId) {
      setActionMessage({ type: "error", text: "동아리 정보를 찾을 수 없습니다." });
      return;
    }

    const trimmedClubInfo = Object.fromEntries(
      Object.entries(clubInfo).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    );

    if (!trimmedClubInfo.clubName) {
      setActionMessage({ type: "error", text: "동아리명을 입력해주세요." });
      return;
    }

    const invalidField = Object.entries(CLUB_INFO_LIMITS).find(
      ([key, limit]) => (trimmedClubInfo[key]?.length ?? 0) > limit
    );

    if (invalidField) {
      const [field, limit] = invalidField;
      const labelMap = {
        clubName: "동아리명",
        category: "카테고리",
        shortDescription: "한 줄 소개",
        detailDescription: "상세 소개",
        regularMeetingTime: "정기 모임",
        activityLocation: "활동 장소",
        contact: "연락처",
      };

      setActionMessage({ type: "error", text: `${labelMap[field]}은 ${limit}자 이하로 입력해주세요.` });
      return;
    }

    updateClubInfoMutation.mutate({
      clubId: targetClubId,
      clubInfo: trimmedClubInfo,
      imageFile: clubImageFile,
    });
  };

  const renderClubInfoPanel = () => (
    <Panel title="동아리 정보 수정" hideTitle>
      {!isValidClubId ? (
        <EmptyText>동아리 정보를 찾을 수 없습니다.</EmptyText>
      ) : isClubDetailLoading ? (
        <EmptyText>동아리 정보를 불러오는 중입니다.</EmptyText>
      ) : isClubDetailError ? (
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["clubDetail", targetClubId] })}>동아리 정보를 불러오지 못했습니다.</RetryState>
      ) : (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">
              동아리명
            </span>
            <input
              value={clubInfo.clubName}
              onChange={(event) =>
                handleClubInfoChange("clubName", event.target.value)
              }
              maxLength={CLUB_INFO_LIMITS.clubName}
              disabled={updateClubInfoMutation.isPending}
              className="rounded-xl border border-slate-200 dark:border-theme-border px-4 py-3 text-sm outline-none focus:border-sky-700 dark:focus:border-theme-focus"
            />
            <FieldCounter value={clubInfo.clubName} limit={CLUB_INFO_LIMITS.clubName} />
          </label>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">카테고리</span>
              <input
                value={clubInfo.category}
                onChange={(event) =>
                  handleClubInfoChange("category", event.target.value)
                }
                maxLength={CLUB_INFO_LIMITS.category}
                disabled={updateClubInfoMutation.isPending}
                className="rounded-xl border border-slate-200 dark:border-theme-border px-4 py-3 text-sm outline-none focus:border-sky-700 dark:focus:border-theme-focus"
              />
              <FieldCounter value={clubInfo.category} limit={CLUB_INFO_LIMITS.category} />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">
                대표 이미지
              </span>
              <label className={`flex min-w-0 flex-col items-center gap-3 rounded-xl border border-dashed p-3 text-center sm:flex-row sm:text-left ${updateClubInfoMutation.isPending ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-theme-border dark:bg-theme-subtle" : "cursor-pointer border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/50 dark:border-theme-border-strong dark:bg-theme-subtle dark:hover:border-theme-focus dark:hover:bg-theme-accent-hover"}`}>
                {(clubImagePreview || clubInfo.imageUrl) && !hasClubImageError ? (
                  <img
                    src={clubImagePreview || clubInfo.imageUrl}
                    alt="동아리 대표 이미지 미리보기"
                    className="aspect-square h-24 w-24 shrink-0 rounded-lg object-cover sm:h-20 sm:w-28 sm:aspect-auto"
                    onError={() => setHasClubImageError(true)}
                  />
                ) : (
                  <div className="flex aspect-square h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 dark:bg-theme-surface dark:text-theme-link sm:h-20 sm:w-28 sm:aspect-auto">
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="max-w-full truncate text-sm font-semibold text-slate-700 dark:text-theme-secondary">
                    {clubImageFile?.name || "이미지 파일 선택"}
                  </p>
                  <p className="mt-1 text-xs text-slate-900/50 dark:text-theme-muted">
                    PNG, JPG · 최대 20MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  disabled={updateClubInfoMutation.isPending}
                  onChange={handleClubImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">한 줄 소개</span>
            <input
              value={clubInfo.shortDescription}
              onChange={(event) =>
                handleClubInfoChange("shortDescription", event.target.value)
              }
            maxLength={CLUB_INFO_LIMITS.shortDescription}
            disabled={updateClubInfoMutation.isPending}
              className="rounded-xl border border-slate-200 dark:border-theme-border px-4 py-3 text-sm outline-none focus:border-sky-700 dark:focus:border-theme-focus"
            />
            <FieldCounter value={clubInfo.shortDescription} limit={CLUB_INFO_LIMITS.shortDescription} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">상세 소개</span>
            <textarea
              value={clubInfo.detailDescription}
              onChange={(event) =>
                handleClubInfoChange("detailDescription", event.target.value)
              }
              maxLength={CLUB_INFO_LIMITS.detailDescription}
              disabled={updateClubInfoMutation.isPending}
              className="min-h-36 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-sky-700 dark:border-theme-border dark:focus:border-theme-focus sm:min-h-44"
            />
            <FieldCounter value={clubInfo.detailDescription} limit={CLUB_INFO_LIMITS.detailDescription} />
          </label>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">
                정기 모임
              </span>
              <input
                value={clubInfo.regularMeetingTime}
                onChange={(event) =>
                  handleClubInfoChange("regularMeetingTime", event.target.value)
                }
                maxLength={CLUB_INFO_LIMITS.regularMeetingTime}
                disabled={updateClubInfoMutation.isPending}
                className="rounded-xl border border-slate-200 dark:border-theme-border px-4 py-3 text-sm outline-none focus:border-sky-700 dark:focus:border-theme-focus"
              />
              <FieldCounter value={clubInfo.regularMeetingTime} limit={CLUB_INFO_LIMITS.regularMeetingTime} />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">
                활동 장소
              </span>
              <input
                value={clubInfo.activityLocation}
                onChange={(event) =>
                  handleClubInfoChange("activityLocation", event.target.value)
                }
                maxLength={CLUB_INFO_LIMITS.activityLocation}
                disabled={updateClubInfoMutation.isPending}
                className="rounded-xl border border-slate-200 dark:border-theme-border px-4 py-3 text-sm outline-none focus:border-sky-700 dark:focus:border-theme-focus"
              />
              <FieldCounter value={clubInfo.activityLocation} limit={CLUB_INFO_LIMITS.activityLocation} />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-theme-secondary">연락처</span>
              <input
                value={clubInfo.contact}
                onChange={(event) =>
                  handleClubInfoChange("contact", event.target.value)
                }
                maxLength={CLUB_INFO_LIMITS.contact}
                disabled={updateClubInfoMutation.isPending}
                className="rounded-xl border border-slate-200 dark:border-theme-border px-4 py-3 text-sm outline-none focus:border-sky-700 dark:focus:border-theme-focus"
              />
              <FieldCounter value={clubInfo.contact} limit={CLUB_INFO_LIMITS.contact} />
            </label>
          </div>

          <button
            type="button"
            onClick={handleClubInfoSubmit}
            disabled={updateClubInfoMutation.isPending}
            className="w-full rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-theme-primary dark:hover:bg-theme-primary-hover dark:disabled:bg-theme-disabled-bg sm:w-auto sm:self-end"
          >
            {updateClubInfoMutation.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      )}
    </Panel>
  );

  const renderApplicantsPanel = () => (
    <Panel title="가입 신청자" hideTitle>
      {!isValidClubId ? (
        <EmptyText>동아리 정보를 찾을 수 없습니다.</EmptyText>
      ) : isJoinRequestsLoading ? (
        <EmptyText>가입 신청자를 불러오는 중입니다.</EmptyText>
      ) : isJoinRequestsError ? (
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["clubJoinRequests", targetClubId] })}>가입 신청자 목록을 불러오지 못했습니다.</RetryState>
      ) : applicants.length === 0 ? (
        <EmptyText>대기 중인 가입 신청이 없습니다.</EmptyText>
      ) : (
        <div className="sm:max-h-112 sm:overflow-y-auto sm:pr-2">
          <div className="flex flex-col gap-2.5">
            {applicants.map((applicant) => {
              const isExpanded = expandedApplicantIds.includes(applicant.id);
              const isApplicantPending =
                (approveJoinRequestMutation.variables?.applicantUserId === applicant.id && approveJoinRequestMutation.isPending) ||
                (rejectJoinRequestMutation.variables?.applicantUserId === applicant.id && rejectJoinRequestMutation.isPending);

              return (
              <div
                key={applicant.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-theme-border"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-gray-900 dark:text-theme-text">
                    {applicant.name}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-900/50 dark:text-theme-muted">
                    {applicant.requestedAt
                      ? `신청일 ${applicant.requestedAt.slice(0, 10)}`
                      : "신청일 정보 없음"}
                  </p>
                </div>

                <div>
                  <p className={`${isExpanded ? "" : "line-clamp-2"} whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-theme-secondary`}>
                    {applicant.message || "작성된 신청 메시지가 없습니다."}
                  </p>
                  {applicant.message?.length > 80 && (
                    <button type="button" onClick={() => setExpandedApplicantIds((current) => current.includes(applicant.id) ? current.filter((id) => id !== applicant.id) : [...current, applicant.id])} className="mt-1 flex min-h-9 items-center gap-1 text-xs font-semibold text-sky-700 dark:text-theme-link">
                      {isExpanded ? "접기" : "전체 보기"}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleApprove(applicant)}
                    disabled={isApplicantPending}
                    className="min-h-11 rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-theme-primary dark:hover:bg-theme-primary-hover dark:disabled:bg-theme-disabled-bg"
                  >
                    {isApplicantPending ? "처리 중" : "승인"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(applicant.id)}
                    disabled={isApplicantPending}
                    className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:border-theme-border dark:text-theme-muted dark:hover:bg-theme-hover dark:disabled:text-theme-disabled"
                  >
                    거절
                  </button>
                </div>

              </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );

  const renderMembersPanel = () => (
    <Panel title="멤버 관리" hideTitle className="flex flex-col sm:min-h-130">
      {!isValidClubId ? (
        <EmptyText>동아리 정보를 찾을 수 없습니다.</EmptyText>
      ) : isMembersLoading ? (
        <EmptyText>멤버 정보를 불러오는 중입니다.</EmptyText>
      ) : isMembersError ? (
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["clubMembers", targetClubId] })}>멤버 정보를 불러오지 못했습니다.</RetryState>
      ) : members.length === 0 ? (
        <EmptyText>등록된 멤버가 없습니다.</EmptyText>
      ) : (
        <div className="min-h-0 flex-1 sm:max-h-130 sm:overflow-y-auto sm:pr-2">
          <div className="flex flex-col gap-2 sm:divide-y sm:divide-slate-200 sm:gap-0 sm:dark:divide-theme-border">
            {members.map((member) => {
              const memberId = member.userId ?? member.id;
              const isSelf = Number(memberId) === loginUserId;
              const isPresident = member.role === "PRESIDENT";

              return (
                <div
                  key={memberId}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-theme-border sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:border-x-0 sm:border-t-0 sm:px-0 sm:py-4"
                >
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 dark:text-theme-text">
                      {member.name}
                      {isSelf && (
                        <span className="ml-2 text-sm font-medium text-sky-700 dark:text-theme-link">
                          나
                        </span>
                      )}
                    </p>
                    {member.email && (
                      <p className="mt-1 break-all text-sm text-slate-900/50 dark:text-theme-muted">
                        {member.email}
                      </p>
                    )}
                  </div>

                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto sm:gap-3">
                    <select
                      value={member.role}
	                      disabled={
	                        !isCurrentUserPresident ||
	                        isSelf ||
	                        updateMemberRoleMutation.isPending ||
	                        transferPresidentMutation.isPending
                      }
                      onChange={(event) =>
                        handleRoleChange(memberId, event.target.value)
                      }
                      title={isSelf ? "본인의 역할은 직접 변경할 수 없습니다." : undefined}
                      className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-theme-border dark:bg-theme-surface dark:text-theme-secondary dark:disabled:bg-theme-subtle dark:disabled:text-theme-disabled"
                    >
                      <option value="PRESIDENT" disabled={!isCurrentUserPresident}>
                        대표
                      </option>
                      <option value="STAFF">운영진</option>
                      <option value="MEMBER">부원</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => requestRemoveMember(member)}
	                      disabled={
	                        !isCurrentUserPresident ||
	                        isSelf ||
	                        isPresident ||
	                        removeMemberMutation.isPending
	                      }
                      title={isSelf ? "본인은 내보낼 수 없습니다." : isPresident ? "대표는 내보낼 수 없습니다." : undefined}
                      className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent dark:text-theme-danger dark:hover:bg-theme-danger-bg dark:disabled:text-theme-disabled"
                    >
                      내보내기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );

  if (authLoading) {
    return (
      <AccessMessage
        title="로그인 상태를 확인하는 중입니다"
        description="대표 관리 페이지 접근 권한을 확인하고 있습니다."
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AccessMessage
        title="로그인이 필요합니다"
        description="대표 관리 페이지는 로그인 후 이용할 수 있습니다."
      />
    );
  }

  if (!isValidClubId) {
    return (
      <AccessMessage
        title="잘못된 동아리 주소입니다"
        description="대표 관리 페이지를 표시할 동아리 정보를 확인할 수 없습니다."
      />
    );
  }

  if (!isMembersLoading && isMembersError) {
    return (
      <AccessMessage
        title="멤버 정보를 불러오지 못했습니다"
        description="대표 권한을 확인할 수 없어 대표 관리 페이지를 표시할 수 없습니다."
      />
    );
  }

  if (!isMembersLoading && !isCurrentUserPresident) {
    return (
      <AccessMessage
        title="접근 권한이 없습니다"
        description="대표만 대표 관리 페이지에 접근할 수 있습니다."
      />
    );
  }

  const renderActivePanel = () => {
    if (activeTab === "applicants") return renderApplicantsPanel();
    if (activeTab === "members") return renderMembersPanel();
    return renderClubInfoPanel();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:px-12 lg:py-12">
      <section className="mx-auto flex w-full max-w-330 flex-col gap-5 sm:gap-8">
        <header className="flex flex-col gap-5 border-b border-slate-300 pb-0 dark:border-theme-border-strong sm:gap-6">
          <button type="button" onClick={() => navigate(`/club/main/${targetClubId}`)} className="flex min-h-11 w-fit items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-slate-600 hover:text-sky-700 dark:text-theme-muted dark:hover:text-theme-link">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            동아리로 돌아가기
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-8 text-gray-900 dark:text-theme-text sm:text-3xl sm:leading-9 lg:text-4xl lg:leading-10">
                대표 관리
              </h1>
              <p className="mt-3 text-base text-slate-900/60 dark:text-theme-muted">
                가입 신청과 멤버 권한, 동아리 정보를 관리하세요.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-theme-border dark:bg-theme-surface dark:shadow-theme-shadow sm:block sm:min-w-40 sm:px-5 sm:py-4 sm:text-right">
              <p className="text-xs text-slate-900/60 dark:text-theme-muted sm:text-sm">현재 대표</p>
              <p className="min-w-0 truncate text-base font-bold text-gray-900 dark:text-theme-text sm:mt-1 sm:text-lg">
                {president?.name ?? "대표 없음"}
              </p>
            </div>
          </div>

          <nav className="grid grid-cols-3" aria-label="대표 관리 메뉴">
            {managementTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setActiveTab(tab.key); setActionMessage(null); }}
                disabled={isAnyMutationPending}
                className={`min-h-12 px-1 py-3 text-sm font-semibold sm:px-7 sm:text-base ${
                  activeTab === tab.key
                    ? "border-b-2 border-blue-600 dark:border-theme-focus text-blue-600 dark:text-theme-link"
                    : "text-slate-900/60 dark:text-theme-muted"
                } disabled:cursor-not-allowed disabled:opacity-50 ${
                  isAnyMutationPending ? "" : "hover:bg-slate-100 dark:hover:bg-theme-hover"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        {actionMessage && (
          <div role={actionMessage.type === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm font-semibold ${actionMessage.type === "error" ? "bg-red-50 text-red-600 dark:bg-theme-danger-bg dark:text-theme-danger" : "bg-emerald-50 text-emerald-700 dark:bg-theme-accent dark:text-theme-link"}`}>
            {actionMessage.text}
          </div>
        )}

        <section>{renderActivePanel()}</section>
      </section>

      {confirmAction && (
        <ConfirmModal
          {...confirmAction}
          isPending={
            transferPresidentMutation.isPending || removeMemberMutation.isPending
          }
          onClose={() => setConfirmAction(null)}
        />
      )}
    </main>
  );
}

function AccessMessage({ title, description }) {
  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-6 dark:bg-theme-page sm:px-6 sm:py-8 lg:px-12 lg:py-12">
      <section className="mx-auto flex min-h-64 max-w-3xl items-center justify-center rounded-xl bg-white p-5 text-center shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:min-h-100 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-theme-text">{title}</h1>
          <p className="mt-3 text-sm text-slate-900/60 dark:text-theme-muted">{description}</p>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children, className = "", hideTitle = false }) {
  return (
    <section
      className={`rounded-xl bg-white p-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)] dark:bg-theme-surface dark:shadow-theme-shadow sm:p-6 ${className}`}
    >
      {!hideTitle && (
        <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-theme-text">{title}</h2>
      )}
      {children}
    </section>
  );
}

function EmptyText({ children }) {
  return <p className="py-8 text-center text-sm text-slate-900/50 dark:text-theme-muted">{children}</p>;
}

function FieldCounter({ value = "", limit }) {
  return (
    <span className="text-right text-xs text-slate-400 dark:text-theme-muted">
      {value.length}/{limit}
    </span>
  );
}

function RetryState({ children, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-slate-900/50 dark:text-theme-muted">{children}</p>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-sky-700 hover:bg-sky-50 dark:border-theme-border dark:text-theme-link dark:hover:bg-theme-hover">
        다시 시도
      </button>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmText,
  danger = false,
  isPending = false,
  onConfirm,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl dark:bg-theme-surface dark:shadow-theme-shadow sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-theme-text">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-900/60 dark:text-theme-muted">
          {description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-theme-muted dark:hover:bg-theme-hover"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? "bg-red-500 dark:bg-theme-danger-action hover:bg-red-600 dark:hover:bg-theme-danger-hover" : "bg-sky-700 dark:bg-theme-primary hover:bg-sky-800 dark:hover:bg-theme-primary-hover"
            }`}
          >
            {isPending ? "처리 중..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
