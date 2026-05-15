import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuOption {
  label: string;
  icon: string;
  onPress: () => void;
  isDangerous?: boolean; // Red color for delete
}

interface PortfolioContextMenuProps {
  visible: boolean;
  title?: string;
  options: MenuOption[];
  onClose: () => void;
  position?: { x: number; y: number };
}

const MENU_WIDTH = 200;
const ITEM_HEIGHT = 48;

export function PortfolioContextMenu({
  visible,
  title,
  options,
  onClose,
  position = { x: 200, y: 100 },
}: PortfolioContextMenuProps) {
  const menuHeight = options.length * ITEM_HEIGHT + 16; // padding

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        {/* Menu Container */}
        <View
          style={[
            styles.menuContainer,
            {
              top: position.y,
              right: Math.max(16, Dimensions.get('window').width - position.x - MENU_WIDTH),
            },
          ]}
        >
          {/* Header (optional) */}
          {title ? (
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
          ) : null}

          {/* Menu Items */}
          {options.map((option, index) => (
            <Pressable
              key={index}
              style={[
                styles.menuItem,
                index !== options.length - 1 && styles.menuItemBorder,
              ]}
              onPress={() => {
                option.onPress();
                onClose();
              }}
            >
              <Ionicons
                name={option.icon as any}
                size={18}
                color={option.isDangerous ? '#ef4444' : '#1f2937'}
                style={styles.menuItemIcon}
              />
              <Text
                style={[
                  styles.menuItemText,
                  option.isDangerous && styles.menuItemTextDangerous,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuContainer: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemIcon: {
    marginRight: 12,
    width: 18,
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  menuItemTextDangerous: {
    color: '#ef4444',
  },
});
