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
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        height: 54,
        // Soft liquid shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
    },
    selectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
        // Modern shadow for white icon box
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    textWrapper: {
        flex: 1,
        marginRight: spacing.sm,
    },
    label: {
        fontSize: 10,
        color: colors.neutral[500],
        fontFamily: 'Kanit-Regular',
        marginBottom: 1,
    },
    value: {
        fontSize: 17,
        fontFamily: 'Kanit-Medium',
        color: colors.neutral[900],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        width: '50%',
        borderRadius: 32,
        maxHeight: '70%',
        paddingBottom: spacing.xl,
        borderWidth: 1,
        borderColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: 'Kanit-Bold',
        color: colors.neutral[900],
    },
    listContent: {
        padding: spacing.md,
    },
    optionItem: {
        paddingVertical: 18,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 20,
        marginBottom: 8,
    },
    optionItemSelected: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    optionContent: {
        flex: 1,
        marginRight: spacing.md,
    },
    optionText: {
        fontSize: 18,
        fontFamily: 'Kanit-Medium',
        color: colors.neutral[700],
    },
    optionTextSelected: {
        color: colors.primary.main,
        fontFamily: 'Kanit-Bold',
    },
    optionSubtext: {
        fontSize: 14,
        fontFamily: 'Kanit-Regular',
        color: colors.neutral[400],
        marginTop: 2,
    },
    separator: {
        height: 0, // Removed for modern look
    },
});
