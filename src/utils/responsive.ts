import { Dimensions, Platform } from 'react-native';

// Tablet breakpoint (typically 768px+)
export const TABLET_BREAKPOINT = 768;

// Base design dimensions (iPad landscape)
const BASE_WIDTH = 1024;
const BASE_HEIGHT = 768;

// Get current dimensions (always fresh)
export const getDimensions = () => Dimensions.get('window');

// For landscape-only app, width should always be greater than height
export const isTablet = () => {
    const dim = Dimensions.get('screen');
    return Math.min(dim.width, dim.height) >= TABLET_BREAKPOINT;
};

export const isLandscape = () => {
    const dim = Dimensions.get('window');
    return dim.width > dim.height;
};

// Force landscape check - app should always be in landscape
export const ensureLandscape = () => {
    const dim = Dimensions.get('window');
    if (dim.width < dim.height) {
        console.warn('App is designed for landscape mode only');
    }
    return dim.width > dim.height;
};

export const getResponsiveValue = <T,>(phoneValue: T, tabletValue: T): T => {
    return isTablet() ? tabletValue : phoneValue;
};

// Scale based on screen width
export const scaleWidth = (size: number): number => {
    const { width } = getDimensions();
    return (width / BASE_WIDTH) * size;
};

// Scale based on screen height
export const scaleHeight = (size: number): number => {
    const { height } = getDimensions();
    return (height / BASE_HEIGHT) * size;
};

// Scale using the smaller ratio to maintain aspect ratio
export const scale = (size: number): number => {
    const { width, height } = getDimensions();
    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    return Math.min(scaleX, scaleY) * size;
};

// Moderate scale - less aggressive scaling
export const moderateScale = (size: number, factor: number = 0.5): number => {
    const { width } = getDimensions();
    const scaleRatio = width / BASE_WIDTH;
    return size + (scaleRatio - 1) * size * factor;
};

// Get responsive object with current values
export const getResponsive = () => {
    const { width, height } = getDimensions();
    const scaleX = width / BASE_WIDTH;
    const scaleY = height / BASE_HEIGHT;
    const minScale = Math.min(scaleX, scaleY);

    return {
        width,
        height,
        isTablet: isTablet(),
        isLandscape: isLandscape(),
        scale: (size: number) => minScale * size,
        scaleWidth: (size: number) => scaleX * size,
        scaleHeight: (size: number) => scaleY * size,
        moderateScale: (size: number, factor: number = 0.5) =>
            size + (scaleX - 1) * size * factor,

        // Scaled spacing values
        spacing: {
            xs: Math.round(4 * minScale),
            sm: Math.round(8 * minScale),
            md: Math.round(12 * minScale),
            lg: Math.round(16 * minScale),
            xl: Math.round(24 * minScale),
            xxl: Math.round(32 * minScale),
        },

        // Scaled font sizes
        fontSize: {
            xs: Math.round(12 * minScale),
            sm: Math.round(14 * minScale),
            md: Math.round(16 * minScale),
            lg: Math.round(18 * minScale),
            xl: Math.round(24 * minScale),
            xxl: Math.round(32 * minScale),
        },

        // Container widths for landscape
        containerWidth: Math.min(width * 0.85, 1400),
        contentMaxWidth: Math.min(width * 0.9, 1200),
    };
};

// For backwards compatibility - but prefer using getResponsive() or useResponsive hook
export const responsive = getResponsive();
