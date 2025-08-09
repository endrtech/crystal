"use client";

import { usePathname, useParams } from "next/navigation";
import { Bell, HelpCircle, Hash, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/user-avatar";
import { ModeToggle } from "@/components/mode-toggle";
import { useSocket } from "../providers/socket-provider";
import { useUser } from "@clerk/nextjs";
import { useDND } from "@/components/providers/dnd-provider";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationItem } from "./notification-item";

interface TopNavigationProps {
  currentProfile: any;
  currentServer?: any;
  currentChannel?: any;
  currentConversation?: any;
}

export const TopNavigation = ({
  currentProfile,
  currentServer,
  currentChannel,
  currentConversation,
}: TopNavigationProps) => {
  const pathname = usePathname();
  const params = useParams();
  const { socket } = useSocket();
  const { user } = useUser();
  const { checkNotificationPermission } = useDND();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageContext, setPageContext] = useState<any>(null);

  // Don't show on root or loading pages
  if (pathname === "/" || pathname === "/loading") {
    return null;
  }

  // Listen for page context updates from socket
  useEffect(() => {
    if (!socket) return;

    const handlePageContextUpdate = (context: any) => {
      setPageContext(context);
    };

    socket.on("page:context:update", handlePageContextUpdate);

    return () => {
      socket.off("page:context:update", handlePageContextUpdate);
    };
  }, [socket]);

  // Emit current page context when params change
  useEffect(() => {
    if (!socket) return;

    const context = {
      pathname,
      serverId: params?.serverId,
      channelId: params?.channelId,
      conversationId: params?.conversationId,
    };

    socket.emit("page:context:set", context);
  }, [socket, pathname, params]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  // Listen for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = async (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Check if user should receive notifications (not in DND mode)
      const canReceiveNotifications = await checkNotificationPermission();
      
      // Show native toast notification only if not in DND mode
      if (canReceiveNotifications && 
          typeof window !== "undefined" && 
          "Notification" in window && 
          Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.content,
          icon: notification.triggeredBy?.imageUrl || "/favicon.ico",
        });
      }
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket]);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  const getPageInfo = () => {
    // Use socket context if available
    if (pageContext) {
      return {
        icon: pageContext.icon === "Hash" ? Hash : 
              pageContext.icon === "Users" ? Users : MessageCircle,
        title: pageContext.title || "Discord Clone",
        subtitle: pageContext.subtitle || "",
        avatar: pageContext.avatar,
      };
    }

    // Use passed props for conversation context
    if (currentConversation) {
      return {
        icon: MessageCircle,
        title: currentConversation.name || "Conversation",
        subtitle: currentConversation.type === "GROUP_MESSAGE" ? "Group Chat" : "Direct Message",
        avatar: null,
      };
    }

    // Use passed props for server context
    if (currentServer && currentChannel) {
      return {
        icon: currentChannel.type === "VOICE" ? Users : Hash,
        title: `#${currentChannel.name}`,
        subtitle: currentServer.name,
        avatar: currentServer.imageUrl,
      };
    }

    // Fallback based on pathname
    if (pathname && pathname.includes("/servers/")) {
      return {
        icon: Hash,
        title: "Server Channel",
        subtitle: "Loading...",
        avatar: null,
      };
    } else if (pathname && pathname.includes("/conversations/")) {
      return {
        icon: MessageCircle,
        title: "Conversation",
        subtitle: "Loading...",
        avatar: null,
      };
    }

    return {
      icon: Hash,
      title: "Discord Clone",
      subtitle: "Welcome",
      avatar: null,
    };
  };

  const pageInfo = getPageInfo();
  const IconComponent = pageInfo.icon;

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <div className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4">
      {/* Left side - Page info */}
      <div className="flex items-center gap-3">
        {pageInfo.avatar ? (
          <Avatar className="w-6 h-6">
            <AvatarImage src={pageInfo.avatar} />
            <AvatarFallback>
              <IconComponent className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <IconComponent className="w-5 h-5 text-zinc-500" />
        )}
        <div>
          <h1 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {pageInfo.title}
          </h1>
          {pageInfo.subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {pageInfo.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-auto p-1"
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  No notifications
                </div>
              ) : (
                <div className="p-1">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <span>Keyboard Shortcuts</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Support</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <span>About</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
