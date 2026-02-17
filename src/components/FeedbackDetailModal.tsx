/**
 * FeedbackDetailModal - Thread conversation view for a feedback
 * Shows message history and allows reply
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, fontSize, borderRadius, fonts } from '../theme/tokens';
import {
  feedbackService,
  FeedbackDetail,
  FeedbackMessage,
} from '../services/feedback.service';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'รอดำเนินการ', color: colors.primary[700], bg: colors.primary[50] },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: '#B45309', bg: '#FEF3C7' },
  RESOLVED: { label: 'แก้ไขแล้ว', color: colors.success, bg: '#D1FAE5' },
  CLOSED: { label: 'ปิดแล้ว', color: colors.neutral[600], bg: colors.neutral[100] },
};

interface Props {
  visible: boolean;
  feedbackId: string;
  onClose: () => void;
}

export const FeedbackDetailModal: React.FC<Props> = ({
  visible,
  feedbackId,
  onClose,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchDetail = async () => {
    try {
      const response = await feedbackService.getFeedbackDetail(feedbackId);
      if (response.data?.success && response.data.feedback) {
        setFeedback(response.data.feedback);
      }
    } catch (error) {
      console.error('Error fetching feedback detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && feedbackId) {
      setIsLoading(true);
      fetchDetail();
      const interval = setInterval(fetchDetail, 15000);
      return () => clearInterval(interval);
    }
  }, [visible, feedbackId]);

  useEffect(() => {
    if (feedback?.messages) {
      setTimeout(
        () => scrollViewRef.current?.scrollToEnd({ animated: true }),
        200,
      );
    }
  }, [feedback?.messages?.length]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const response = await feedbackService.sendMessage(
        feedbackId,
        message.trim(),
      );
      if (response.data?.success && response.data.message) {
        setFeedback((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  { ...response.data.message, images: [] },
                ],
              }
            : prev,
        );
        setMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
    });

  // Group messages by date
  const groupedMessages =
    feedback?.messages.reduce<
      { date: string; messages: FeedbackMessage[] }[]
    >((acc, msg) => {
      const date = formatDate(msg.createdAt);
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.date === date) {
        lastGroup.messages.push(msg);
      } else {
        acc.push({ date, messages: [msg] });
      }
      return acc;
    }, []) || [];

  const statusCfg = STATUS_CONFIG[feedback?.status || 'OPEN'];
  const isClosed = feedback?.status === 'CLOSED';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={colors.neutral[600]}
              />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {feedback?.subject || 'Loading...'}
              </Text>
              {feedback && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusCfg.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Messages */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[600]} />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
            >
              {groupedMessages.map((group, gi) => (
                <View key={gi}>
                  <View style={styles.dateSeparator}>
                    <View style={styles.dateLine} />
                    <Text style={styles.dateText}>{group.date}</Text>
                    <View style={styles.dateLine} />
                  </View>

                  {group.messages.map((msg) => {
                    const isAdmin = msg.senderType === 'ADMIN';
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageBubbleContainer,
                          isAdmin ? styles.bubbleLeft : styles.bubbleRight,
                        ]}
                      >
                        <Text
                          style={[
                            styles.senderLabel,
                            isAdmin
                              ? styles.senderLabelAdmin
                              : styles.senderLabelUser,
                          ]}
                        >
                          {msg.senderName || (isAdmin ? 'ทีมงาน' : 'คุณ')}
                        </Text>
                        <View
                          style={[
                            styles.bubble,
                            isAdmin ? styles.bubbleAdmin : styles.bubbleUser,
                          ]}
                        >
                          <Text
                            style={[
                              styles.bubbleText,
                              isAdmin
                                ? styles.bubbleTextAdmin
                                : styles.bubbleTextUser,
                            ]}
                          >
                            {msg.message}
                          </Text>
                        </View>
                        {msg.images && msg.images.length > 0 && (
                          <View style={styles.imageRow}>
                            {msg.images.map((img) => (
                              <View key={img.id} style={styles.msgImage}>
                                <Image
                                  source={{ uri: img.imageUrl }}
                                  style={styles.msgImageInner}
                                />
                              </View>
                            ))}
                          </View>
                        )}
                        <Text
                          style={[
                            styles.timeText,
                            isAdmin ? {} : { textAlign: 'right' },
                          ]}
                        >
                          {formatTime(msg.createdAt)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.messageInput}
              placeholder={
                isClosed ? 'Feedback นี้ถูกปิดแล้ว' : 'พิมพ์ข้อความ...'
              }
              placeholderTextColor={colors.neutral[400]}
              value={message}
              onChangeText={setMessage}
              editable={!isClosed}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!message.trim() || sending || isClosed) &&
                  styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!message.trim() || sending || isClosed}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={18}
                  color={colors.white}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.neutral[900],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: { fontFamily: fonts.bold, fontSize: 10 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  messagesList: { flex: 1 },
  messagesContent: { padding: spacing.md, paddingBottom: spacing.xl },

  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.neutral[200] },
  dateText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.xs,
    color: colors.neutral[400],
  },

  messageBubbleContainer: { marginBottom: spacing.md, maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  senderLabel: { fontFamily: fonts.bold, fontSize: 10, marginBottom: 2 },
  senderLabelAdmin: { color: colors.success },
  senderLabelUser: { color: colors.primary[500], textAlign: 'right' },

  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  bubbleAdmin: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  bubbleTextAdmin: { color: colors.neutral[800] },
  bubbleTextUser: { color: colors.white },

  imageRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  msgImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  msgImageInner: { width: '100%', height: '100%' },

  timeText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.neutral[400],
    marginTop: 2,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: { opacity: 0.5 },
});
