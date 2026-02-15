import { useState, useRef, useEffect } from "react";
import { Plus, X, Pencil, Check, ChevronDown } from "lucide-react";
import { useFundStore } from "../store/fundStore.js";
import { DEFAULT_GROUP_ID } from "../types/fund.js";

interface GroupTabsProps {
  onGroupChange?: (groupId: string) => void;
}

export function GroupTabs({ onGroupChange }: GroupTabsProps) {
  const {
    groups,
    activeGroupId,
    setActiveGroup,
    addGroup,
    removeGroup,
    renameGroup,
  } = useFundStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (editingGroupId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingGroupId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      addGroup(newGroupName.trim());
      setNewGroupName("");
      setIsAdding(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddGroup();
    } else if (e.key === "Escape") {
      setNewGroupName("");
      setIsAdding(false);
    }
  };

  const handleStartEdit = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingName(currentName);
    setShowDropdown(false);
  };

  const handleSaveEdit = () => {
    if (editingGroupId && editingName.trim()) {
      renameGroup(editingGroupId, editingName.trim());
    }
    setEditingGroupId(null);
    setEditingName("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingGroupId(null);
      setEditingName("");
    }
  };

  const handleRemoveGroup = (groupId: string) => {
    if (groupId === DEFAULT_GROUP_ID) return;
    const group = groups.find((g) => g.id === groupId);
    const fundCount = group?.funds.length || 0;
    const message =
      fundCount > 0
        ? `确定要删除分组"${group?.name}"吗？分组内的 ${fundCount} 只基金将被移动到默认分组。`
        : `确定要删除分组"${group?.name}"吗？`;
    if (confirm(message)) {
      removeGroup(groupId);
      setShowDropdown(false);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setActiveGroup(groupId);
    onGroupChange?.(groupId);
  };

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div className="mb-6">
      <div className="hidden sm:flex items-center gap-2 flex-wrap">
        {sortedGroups.map((group) => (
          <div key={group.id} className="relative group/tab">
            {editingGroupId === group.id ? (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-lg px-2 py-1.5">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={handleSaveEdit}
                  className="w-20 text-sm outline-none"
                  maxLength={20}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-0.5 text-blue-500 hover:text-blue-600"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleSelectGroup(group.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeGroupId === group.id
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{group.name}</span>
                <span
                  className={`text-xs ${
                    activeGroupId === group.id
                      ? "text-blue-200"
                      : "text-gray-400"
                  }`}
                >
                  ({group.funds.length})
                </span>
              </button>
            )}
            {group.id !== DEFAULT_GROUP_ID && editingGroupId !== group.id && (
              <div className="absolute -top-1 -right-1 hidden group-hover/tab:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(group.id, group.name);
                  }}
                  className="p-0.5 bg-white rounded-full shadow-sm border border-gray-200 text-gray-500 hover:text-blue-500"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveGroup(group.id);
                  }}
                  className="p-0.5 bg-white rounded-full shadow-sm border border-gray-200 text-gray-500 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {isAdding ? (
          <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-lg px-2 py-1.5">
            <input
              ref={inputRef}
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onBlur={() => {
                if (!newGroupName.trim()) {
                  setIsAdding(false);
                }
              }}
              placeholder="分组名称"
              className="w-20 text-sm outline-none"
              maxLength={20}
            />
            <button
              onClick={handleAddGroup}
              disabled={!newGroupName.trim()}
              className="p-0.5 text-blue-500 hover:text-blue-600 disabled:text-gray-300"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setNewGroupName("");
                setIsAdding(false);
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors border border-dashed border-gray-300 hover:border-blue-300"
          >
            <Plus className="w-4 h-4" />
            <span>新建分组</span>
          </button>
        )}
      </div>

      <div className="sm:hidden relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium"
        >
          <div className="flex items-center gap-2">
            <span>{activeGroup?.name || "选择分组"}</span>
            <span className="text-xs text-gray-400">
              ({activeGroup?.funds.length || 0})
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
          />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {sortedGroups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 ${
                  activeGroupId === group.id ? "bg-blue-50" : ""
                }`}
              >
                <button
                  onClick={() => {
                    handleSelectGroup(group.id);
                    setShowDropdown(false);
                  }}
                  className="flex-1 text-left flex items-center gap-2"
                >
                  <span
                    className={
                      activeGroupId === group.id
                        ? "text-blue-600 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {group.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({group.funds.length})
                  </span>
                </button>
                {group.id !== DEFAULT_GROUP_ID && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(group.id, group.name);
                      }}
                      className="p-1.5 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveGroup(group.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                setIsAdding(true);
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 border-t border-gray-100"
            >
              <Plus className="w-4 h-4" />
              <span>新建分组</span>
            </button>
          </div>
        )}

        {isAdding && (
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="输入分组名称"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              maxLength={20}
            />
            <button
              onClick={handleAddGroup}
              disabled={!newGroupName.trim()}
              className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              确定
            </button>
            <button
              onClick={() => {
                setNewGroupName("");
                setIsAdding(false);
              }}
              className="px-3 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
