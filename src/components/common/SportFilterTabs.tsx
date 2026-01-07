import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, fonts, spacing } from '../../theme/tokens';

const SPORT_LABELS: Record<string, string> = {
    'badminton': 'แบดมินตัน',
    'football': 'ฟุตบอล',
    'futsal': 'ฟุตซอล',
    'tennis': 'เทนนิส',
    'basketball': 'บาสเกตบอล',
    'volleyball': 'วอลเลย์บอล',
    'swimming': 'ว่ายน้ำ',
    'fitness': 'ฟิตเนส',
    'yoga': 'โยคะ',
    'gym': 'ยิม'
};

const getSportName = (id: string) => SPORT_LABELS[id] || id;

interface SportFilterTabsProps {
    sports: string[];
    selectedSport: string;
    onSelectSport: (sport: string) => void;
    containerStyle?: any;
}

export const SportFilterTabs: React.FC<SportFilterTabsProps> = ({
    sports,
    selectedSport,
    onSelectSport,
    containerStyle
}) => {
    return (
        <View style={[styles.tabContainer, containerStyle]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScrollContent}
            >
                {sports.map(sport => (
                    <TouchableOpacity
                        key={sport}
                        style={[
                            styles.tabItem,
                            selectedSport === sport && styles.tabItemSelected
                        ]}
                        onPress={() => onSelectSport(sport)}
                    >
                        <Text style={[
                            styles.tabText,
                            selectedSport === sport && styles.tabTextSelected
                        ]}>
                            {sport === 'ALL' ? 'ทั้งหมด' : getSportName(sport)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    tabContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginTop: 8,
    },
    tabScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        gap: 8,
    },
    tabItem: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    tabItemSelected: {
        backgroundColor: colors.primary.main,
        borderColor: colors.primary.main,
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    tabText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.neutral[600],
    },
    tabTextSelected: {
        color: colors.white,
        fontFamily: fonts.semiBold,
    },
});
