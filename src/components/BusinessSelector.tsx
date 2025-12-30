import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    FlatList,
    SafeAreaView,
    TouchableWithoutFeedback,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, fontSize } from '../theme/tokens';
import { Business } from '../types/business';
import { responsive } from '../utils/responsive';

interface BusinessSelectorProps {
    businesses: Business[];
    selectedId: string | null;
    onSelect: (business: Business) => void;
    containerStyle?: any;
}

export const BusinessSelector = ({ businesses, selectedId, onSelect, containerStyle }: BusinessSelectorProps) => {
    const [isVisible, setIsVisible] = useState(false);

    // If no businesses, show a placeholder or loading state instead of null
    if (!businesses || businesses.length === 0) {
        return (
            <View style={[styles.selectorButton, { opacity: 0.7 }, containerStyle]}>
                <View style={styles.selectorContent}>
                    <View style={[styles.iconWrapper, { backgroundColor: colors.neutral[100] }]}>
                        <MaterialCommunityIcons name="store-off" size={20} color={colors.neutral[400]} />
                    </View>
                    <View style={styles.textWrapper}>
                        <Text style={styles.label}>เลือกธุรกิจ</Text>
                        <Text style={styles.value}>ไม่พบข้อมูลธุรกิจ</Text>
                    </View>
                </View>
            </View>
        );
    }

    const selectedBusiness = businesses.find(b => b.id === selectedId);

    const handleSelect = (business: Business) => {
        onSelect(business);
        setIsVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.selectorButton, containerStyle]}
                onPress={() => setIsVisible(true)}
                activeOpacity={0.7}
            >
                <View style={styles.selectorContent}>
                    <View style={styles.iconWrapper}>
                        <MaterialCommunityIcons name="store" size={16} color={colors.primary.main} />
                    </View>
                    <View style={styles.textWrapper}>
                        <Text style={styles.value} numberOfLines={1}>
                            {selectedBusiness ? selectedBusiness.name : 'กรุณาเลือกธุรกิจ'}
                        </Text>
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.neutral[500]} />
            </TouchableOpacity>

            <Modal
                visible={isVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsVisible(false)}
                supportedOrientations={['landscape']}
            >
                <TouchableWithoutFeedback onPress={() => setIsVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>เลือกธุรกิจของคุณ</Text>
                                    <TouchableOpacity onPress={() => setIsVisible(false)}>
                                        <MaterialCommunityIcons name="close" size={24} color={colors.neutral[500]} />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={businesses}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.optionItem,
                                                item.id === selectedId && styles.optionItemSelected
                                            ]}
                                            onPress={() => handleSelect(item)}
                                        >
                                            <View style={styles.optionContent}>
                                                <Text style={[
                                                    styles.optionText,
                                                    item.id === selectedId && styles.optionTextSelected
                                                ]}>
                                                    {item.name}
                                                </Text>
                                                {item.description && (
                                                    <Text style={styles.optionSubtext} numberOfLines={1}>
                                                        {item.description}
                                                    </Text>
                                                )}
                                            </View>
                                            {item.id === selectedId && (
                                                <MaterialCommunityIcons name="check" size={20} color={colors.primary.main} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                                    contentContainerStyle={styles.listContent}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        height: 42,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary.light + '20', // 20% opacity
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    textWrapper: {
        flex: 1,
        marginRight: spacing.sm,
    },
    label: {
        fontSize: responsive.fontSize.xs,
        color: colors.neutral[500],
        marginBottom: 2,
    },
    value: {
        fontSize: responsive.fontSize.sm,
        fontWeight: '600',
        color: colors.neutral[900],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '70%',
        paddingBottom: spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    modalTitle: {
        fontSize: responsive.fontSize.lg,
        fontWeight: '600',
        color: colors.neutral[900],
    },
    listContent: {
        padding: spacing.md,
    },
    optionItem: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: borderRadius.md,
    },
    optionItemSelected: {
        backgroundColor: colors.primary.light + '10',
    },
    optionContent: {
        flex: 1,
        marginRight: spacing.md,
    },
    optionText: {
        fontSize: responsive.fontSize.md,
        color: colors.neutral[800],
    },
    optionTextSelected: {
        color: colors.primary.main,
        fontWeight: '600',
    },
    optionSubtext: {
        fontSize: responsive.fontSize.sm,
        color: colors.neutral[500],
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: colors.neutral[100],
    },
});
