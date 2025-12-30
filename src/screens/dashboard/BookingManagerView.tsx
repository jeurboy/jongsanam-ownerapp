import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, borderRadius } from '../../theme/tokens';

export const BookingManagerView = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>จัดการการจอง</Text>
                <Text style={styles.subtitle}>ดูและจัดการรายการจองสนามทั้งหมด</Text>
            </View>
            <View style={styles.content}>
                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>ยังไม่มีรายการจอง</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.neutral[50],
        padding: spacing.lg,
    },
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 24,
        color: colors.neutral[900],
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: colors.neutral[500],
    },
    content: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.neutral[200],
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontFamily: fonts.medium,
        fontSize: 18,
        color: colors.neutral[400],
    },
});
