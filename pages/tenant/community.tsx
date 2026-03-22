import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import TenantPortalShell from "../../components/auth/TenantPortalShell";
import PageMeta from "../../components/layout/PageMeta";
import { useTenantPortalSession } from "../../context/TenantSessionContext";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import { apiRequest } from "../../lib/api";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";

interface CommunityGroupRecord {
  id: string;
  name: string;
  description: string;
  property: {
    id: string;
    name: string;
  };
  createdBy: string;
  joined: boolean;
  role?: "owner" | "member" | null;
  canLeave: boolean;
  memberCount: number;
  memberPreview: Array<{
    id: string;
    name: string;
    unit: string;
    initials: string;
  }>;
  latestActivity: string;
  latestMessagePreview: string;
}

interface CommunityGroupsResponse {
  property: {
    id: string;
    name: string;
  };
  summary: {
    total: number;
    joined: number;
    discoverable: number;
  };
  groups: CommunityGroupRecord[];
}

interface CommunityMessagesResponse {
  group: CommunityGroupRecord;
  messages: Array<{
    id: string;
    body: string;
    imageUrl?: string | null;
    createdAtLabel: string;
    isMine: boolean;
    sender: {
      id: string;
      name: string;
      unit: string;
      initials: string;
    };
  }>;
}

interface CommunityGroupMutationResponse {
  group: CommunityGroupRecord;
}

interface CommunityMessageMutationResponse {
  message: CommunityMessagesResponse["messages"][number];
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("We could not read the selected image."));
    };
    reader.onerror = () => reject(new Error("We could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export default function TenantCommunityPage() {
  const { tenantSession } = useTenantPortalSession();
  const { showToast } = usePrototypeUI();
  const [groupData, setGroupData] = useState<CommunityGroupsResponse | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [messageData, setMessageData] = useState<CommunityMessagesResponse | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
  });
  const [messageForm, setMessageForm] = useState({
    body: "",
    imageDataUrl: "",
    imageName: "",
    imageMimeType: "",
  });

  const selectedGroup = useMemo(
    () => groupData?.groups.find((group) => group.id === selectedGroupId) ?? null,
    [groupData?.groups, selectedGroupId],
  );

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    let cancelled = false;

    async function loadGroups() {
      setLoadingGroups(true);
      setError("");

      try {
        const { data } = await apiRequest<CommunityGroupsResponse>(
          "/tenant/community/groups",
          {
            token: tenantToken,
          },
        );

        if (!cancelled) {
          setGroupData(data);
          setSelectedGroupId((current) => {
            if (current && data.groups.some((group) => group.id === current)) {
              return current;
            }

            return (
              data.groups.find((group) => group.joined)?.id ??
              data.groups[0]?.id ??
              ""
            );
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your community groups.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingGroups(false);
        }
      }
    }

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, [tenantSession?.token]);

  useEffect(() => {
    const tenantToken = tenantSession?.token;

    if (!tenantToken || !selectedGroupId) {
      setMessageData(null);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);

      try {
        const { data } = await apiRequest<CommunityMessagesResponse>(
          `/tenant/community/groups/${selectedGroupId}/messages`,
          {
            token: tenantToken,
          },
        );

        if (!cancelled) {
          setMessageData(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setMessageData(null);

          if (selectedGroup?.joined) {
            showToast(
              requestError instanceof Error
                ? requestError.message
                : "We could not load this chat.",
              "error",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    if (selectedGroup?.joined) {
      void loadMessages();
    } else {
      setMessageData(null);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedGroup?.joined, selectedGroupId, showToast, tenantSession?.token]);

  async function reloadGroups() {
    const tenantToken = tenantSession?.token;

    if (!tenantToken) {
      return;
    }

    const { data } = await apiRequest<CommunityGroupsResponse>("/tenant/community/groups", {
      token: tenantToken,
    });

    setGroupData(data);

    if (selectedGroupId && !data.groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(data.groups.find((group) => group.joined)?.id ?? data.groups[0]?.id ?? "");
    }
  }

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantSession?.token) {
      return;
    }

    setCreatingGroup(true);

    try {
      const { data } = await apiRequest<CommunityGroupMutationResponse>(
        "/tenant/community/groups",
        {
          method: "POST",
          token: tenantSession.token,
          body: {
            name: groupForm.name,
            description: groupForm.description || undefined,
          },
        },
      );

      await reloadGroups();
      setSelectedGroupId(data.group.id);
      setGroupForm({ name: "", description: "" });
      showToast("Community group created", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not create this community group.",
        "error",
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  async function joinGroup(groupId: string) {
    if (!tenantSession?.token) {
      return;
    }

    setJoiningGroupId(groupId);

    try {
      await apiRequest<CommunityGroupMutationResponse>(
        `/tenant/community/groups/${groupId}/join`,
        {
          method: "POST",
          token: tenantSession.token,
        },
      );

      await reloadGroups();
      setSelectedGroupId(groupId);
      showToast("You joined the group", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not join this group.",
        "error",
      );
    } finally {
      setJoiningGroupId(null);
    }
  }

  async function leaveGroup(groupId: string) {
    if (!tenantSession?.token) {
      return;
    }

    setLeavingGroupId(groupId);

    try {
      await apiRequest<CommunityGroupMutationResponse>(
        `/tenant/community/groups/${groupId}/leave`,
        {
          method: "POST",
          token: tenantSession.token,
        },
      );

      await reloadGroups();
      if (selectedGroupId === groupId) {
        setSelectedGroupId(
          groupData?.groups.find((group) => group.id !== groupId && group.joined)?.id ?? "",
        );
      }
      showToast("You left the group", "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not leave this group.",
        "error",
      );
    } finally {
      setLeavingGroupId(null);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setMessageForm((current) => ({
        ...current,
        imageDataUrl: "",
        imageName: "",
        imageMimeType: "",
      }));
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setMessageForm((current) => ({
        ...current,
        imageDataUrl: dataUrl,
        imageName: file.name,
        imageMimeType: file.type || "image/jpeg",
      }));
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not read this image.",
        "error",
      );
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantSession?.token || !selectedGroupId || !selectedGroup?.joined) {
      return;
    }

    setSendingMessage(true);

    try {
      const { data } = await apiRequest<CommunityMessageMutationResponse>(
        `/tenant/community/groups/${selectedGroupId}/messages`,
        {
          method: "POST",
          token: tenantSession.token,
          body: {
            body: messageForm.body || undefined,
            imageDataUrl: messageForm.imageDataUrl || undefined,
            imageName: messageForm.imageName || undefined,
            imageMimeType: messageForm.imageMimeType || undefined,
          },
        },
      );

      setMessageData((current) =>
        current
          ? {
              ...current,
              messages: [...current.messages, data.message],
            }
          : current,
      );
      setMessageForm({
        body: "",
        imageDataUrl: "",
        imageName: "",
        imageMimeType: "",
      });
      await reloadGroups();
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "We could not send this message.",
        "error",
      );
    } finally {
      setSendingMessage(false);
    }
  }

  const description = groupData
    ? `${groupData.summary.joined} joined group(s) in ${groupData.property.name} · Share updates, images, and neighbour feedback`
    : loadingGroups
      ? "Loading your community groups..."
      : error || "No groups available.";

  return (
    <>
      <PageMeta title="DoorRent — Community" />
      <TenantPortalShell topbarTitle="Community" breadcrumb="Dashboard → Community">
        <PageHeader
          title="Community"
          description={description}
        />

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Create a Group</div>
                  <div className="card-subtitle">
                    Start a compound conversation and let neighbours join in.
                  </div>
                </div>
              </div>
              <form className="card-body" onSubmit={submitGroup}>
                <div className="form-group">
                  <label className="form-label">Group Name *</label>
                  <input
                    className="form-input"
                    value={groupForm.name}
                    onChange={(event) =>
                      setGroupForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Lekki Gardens Tenants Forum"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 90 }}
                    value={groupForm.description}
                    onChange={(event) =>
                      setGroupForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="What is this group for?"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={creatingGroup}>
                  {creatingGroup ? "Creating..." : "Create Group"}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Available Groups</div>
                  <div className="card-subtitle">
                    Join estate conversations or leave any group when you move out.
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(groupData?.groups ?? []).map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: "var(--radius)",
                      border:
                        selectedGroupId === group.id
                          ? "1.5px solid var(--accent)"
                          : "1px solid var(--border)",
                      background:
                        selectedGroupId === group.id
                          ? "var(--accent-light)"
                          : "var(--surface)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{group.name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink3)" }}>
                          {group.memberCount} member(s) · {group.latestActivity}
                        </div>
                      </div>
                      <StatusBadge tone={group.joined ? "green" : "amber"}>
                        {group.joined ? "Joined" : "Open"}
                      </StatusBadge>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6, marginBottom: 10 }}>
                      {group.description || "No description yet."}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 12 }}>
                      {group.latestMessagePreview}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!group.joined ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            void joinGroup(group.id);
                          }}
                          disabled={joiningGroupId === group.id}
                        >
                          {joiningGroupId === group.id ? "Joining..." : "Join Group"}
                        </button>
                      ) : null}
                      {group.joined && group.canLeave ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            void leaveGroup(group.id);
                          }}
                          disabled={leavingGroupId === group.id}
                        >
                          {leavingGroupId === group.id ? "Leaving..." : "Leave Group"}
                        </button>
                      ) : null}
                    </div>
                  </button>
                ))}
                {!loadingGroups && !(groupData?.groups.length ?? 0) ? (
                  <div style={{ textAlign: "center", color: "var(--ink2)" }}>
                    No groups yet in this compound.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card" style={{ minHeight: 620 }}>
            <div className="card-header">
              <div>
                <div className="card-title">
                  {selectedGroup?.name ?? "Select a Group"}
                </div>
                <div className="card-subtitle">
                  {selectedGroup
                    ? selectedGroup.joined
                      ? `${selectedGroup.memberCount} members · ${selectedGroup.property.name}`
                      : "Join this group to read messages and post images."
                    : "Choose a community group to view the conversation."}
                </div>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {selectedGroup?.joined ? (
                <>
                  <div
                    style={{
                      maxHeight: 360,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      paddingRight: 4,
                    }}
                  >
                    {(messageData?.messages ?? []).map((message) => (
                      <div
                        key={message.id}
                        style={{
                          alignSelf: message.isMine ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          padding: 12,
                          borderRadius: "var(--radius)",
                          background: message.isMine ? "var(--accent-light)" : "var(--surface2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", marginBottom: 6 }}>
                          {message.sender.name} · Unit {message.sender.unit}
                        </div>
                        {message.body ? (
                          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6 }}>
                            {message.body}
                          </div>
                        ) : null}
                        {message.imageUrl ? (
                          <img
                            src={message.imageUrl}
                            alt="Community upload"
                            style={{
                              marginTop: message.body ? 10 : 0,
                              width: "100%",
                              maxHeight: 220,
                              objectFit: "cover",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border)",
                            }}
                          />
                        ) : null}
                        <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 8 }}>
                          {message.createdAtLabel}
                        </div>
                      </div>
                    ))}
                    {loadingMessages ? (
                      <div style={{ textAlign: "center", color: "var(--ink2)" }}>
                        Loading chat...
                      </div>
                    ) : null}
                    {!loadingMessages && !(messageData?.messages.length ?? 0) ? (
                      <div style={{ textAlign: "center", color: "var(--ink2)" }}>
                        No messages yet. Be the first to say something.
                      </div>
                    ) : null}
                  </div>

                  <form onSubmit={submitMessage}>
                    <div className="form-group">
                      <label className="form-label">Message</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: 110 }}
                        value={messageForm.body}
                        onChange={(event) =>
                          setMessageForm((current) => ({
                            ...current,
                            body: event.target.value,
                          }))
                        }
                        placeholder="Share an update, suggestion, or image with your neighbours."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Attach Image</label>
                      <input
                        className="form-input"
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleImageChange(event)}
                      />
                      {messageForm.imageName ? (
                        <div className="td-muted" style={{ marginTop: 6 }}>
                          Selected: {messageForm.imageName}
                        </div>
                      ) : null}
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={sendingMessage}>
                      {sendingMessage ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                </>
              ) : selectedGroup ? (
                <div style={{ textAlign: "center", color: "var(--ink2)", padding: "40px 0" }}>
                  Join <strong>{selectedGroup.name}</strong> to read messages and share images.
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--ink2)", padding: "40px 0" }}>
                  Select a group on the left to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </TenantPortalShell>
    </>
  );
}
