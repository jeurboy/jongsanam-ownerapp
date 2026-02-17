/**
 * FeedbackModal - Full-screen modal for sending and viewing feedback
 * Has 2 tabs: "ส่งข้อเสนอแนะ" (create form) and "รายการของฉัน" (my list)
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, fontSize, borderRadius, fonts } from '../theme/tokens';
import {
  feedbackService,
  FeedbackSummary,
  CreateFeedbackData,
} from '../services/feedback.service';
import { FeedbackDetailModal } from './FeedbackDetailModal';

const CATEGORIES = [
  { value: 'BUG_REPORT', label: 'แจ้งปัญหา', icon: 'bug' },
  { value: 'SUGGESTION', label: 'ข้อเสนอแนะ', icon: 'lightbulb-on' },
  { value: 'COMPLAINT', label: 'ร้องเรียน', icon: 'alert-circle' },
  { value: 'GENERAL', label: 'ทั่วไป', icon: 'chat' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'รอดำเนินการ', color: colors.primary[700], bg: colors.primary[50] },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', color: '#B45309', bg: '#FEF3C7' },
  RESOLVED: { label: 'แก้ไขแล้ว', color: colors.success, bg: '#D1FAE5' },
  CLOSED: { label: 'ปิดแล้ว', color: colors.neutral[600], bg: colors.neutral[100] },
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<Props> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form state
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // List state
  const [feedbacks, setFeedbacks] = useState<FeedbackSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Detail modal state
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await feedbackService.getMyFeedbacks();
      if (response.data?.success) {
        setFeedbacks(response.data.feedbacks || []);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (visible && activeTab === 'list') {
      fetchFeedbacks();
    }
  }, [visible, activeTab, fetchFeedbacks]);

  const resetForm = () => {
    setCategory('');
    setSubject('');
    setMessage('');
    setContactEmail('');
  };

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !message.trim()) {
      Alert.alert('กรุณากรอกข้อมูล', 'กรุณาเลือกหมวดหมู่ กรอกหัวข้อ และรายละเอียด');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateFeedbackData = {
        category,
        subject: subject.trim(),
        message: message.trim(),
        platform: 'OWNER_APP',
        ...(contactEmail.trim() ? { contactEmail: contactEmail.trim() } : {}),
      };

      const response = await feedbackService.createFeedback(payload);

      if (response.data?.success && response.data.feedback) {
        resetForm();
        setActiveTab('list');
        fetchFeedbacks();
        Alert.alert('สำเร็จ', 'ส่งข้อเสนอแนะเรียบร้อยแล้ว');
      } else {
        Alert.alert('ผิดพลาด', response.error || 'ไม่สามารถส่งข้อเสนอแนะได้');
      }
    } catch (error) {
      Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCreateTab = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Category Selection */}
      <Text style={styles.sectionLabel}>หมวดหมู่ *</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.categoryChip, category === cat.value && styles.categoryChipActive]}
            onPress={() => setCategory(cat.value)}
          >
            <MaterialCommunityIcons
              name={cat.icon}
              size={18}
              color={category === cat.value ? colors.white : colors.neutral[600]}
            />
            <Text
              style={[
                styles.categoryChipText,
                category === cat.value && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subject */}
      <Text style={styles.sectionLabel}>หัวข้อ *</Text>
      <TextInput
        style={styles.input}
        placeholder="สรุปสั้นๆ เกี่ยวกับข้อเสนอแนะ"
        placeholderTextColor={colors.neutral[400]}
        value={subject}
        onChangeText={setSubject}
        maxLength={255}
      />

      {/* Message */}
      <Text style={styles.sectionLabel}>รายละเอียด *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="อธิบายรายละเอียดเพิ่มเติม..."
        placeholderTextColor={colors.neutral[400]}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={5000}
        textAlignVertical="top"
      />

      {/* Contact Email (optional) */}
      <Text style={styles.sectionLabel}>อีเมลติดต่อกลับ (ไม่บังคับ)</Text>
      <TextInput
        style={styles.input}
        placeholder="email@example.com"
        placeholderTextColor={colors.neutral[400]}
        value={contactEmail}
        onChangeText={setContactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={18} color={colors.white} />
            <Text style={styles.submitBtnText}>ส่งข้อเสนอแนะ</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderListTab = () => (
    <View style={styles.listContainer}>
      {loadingList ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : feedbacks.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="chat-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyText}>ยังไม่มีข้อเสนอแนะ</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {feedbacks.map((fb) => {
            const statusCfg = STATUS_CONFIG[fb.status] || STATUS_CONFIG.OPEN;
            return (
              <TouchableOpacity
                key={fb.id}
                style={styles.feedbackItem}
                onPress={() => setSelectedFeedbackId(fb.id)}
              >
                <View style={styles.feedbackItemHeader}>
                  <Text style={styles.feedbackSubject} numberOfLines={1}>
                    {fb.subject}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.feedbackItemFooter}>
                  <Text style={styles.feedbackMeta}>
                    {CATEGORIES.find((c) => c.value === fb.category)?.label || fb.category}
                  </Text>
                  <Text style={styles.feedbackMeta}>
                    {new Date(fb.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={styles.feedbackMeta}>
                    {fb._count?.messages || 0} ข้อความ
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color={colors.neutral[600]} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>ข้อเสนอแนะ</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'create' && styles.tabActive]}
                onPress={() => setActiveTab('create')}
              >
                <MaterialCommunityIcons
                  name="pencil-plus"
                  size={16}
                  color={activeTab === 'create' ? colors.primary[600] : colors.neutral[400]}
                />
                <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                  ส่งข้อเสนอแนะ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'list' && styles.tabActive]}
                onPress={() => setActiveTab('list')}
              >
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={16}
                  color={activeTab === 'list' ? colors.primary[600] : colors.neutral[400]}
                />
                <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
                  รายการของฉัน
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'create' ? renderCreateTab() : renderListTab()}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      {selectedFeedbackId && (
        <FeedbackDetailModal
          visible={!!selectedFeedbackId}
          feedbackId={selectedFeedbackId}
          onClose={() => {
            setSelectedFeedbackId(null);
            fetchFeedbacks();
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.neutral[900],
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[600],
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.neutral[400],
  },
  tabTextActive: {
    color: colors.primary[600],
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSize.sm,
    color: colors.neutral[700],
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  categoryChipText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.neutral[600],
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.neutral[900],
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.white,
  },
  listContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    color: colors.neutral[400],
  },
  feedbackItem: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  feedbackItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  feedbackSubject: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: fontSize.md,
    color: colors.neutral[800],
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  feedbackItemFooter: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feedbackMeta: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.neutral[400],
  },
});
