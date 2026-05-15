import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Pressable,
  TextInput,
  Switch,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ArrowLeft,
  Plus,
  Package as PackageIcon,
  Clock,
  Edit,
  Trash2,
  ToggleRight,
  ToggleLeft,
  Zap,
  Car,
  Gift,
  AlertCircle,
} from 'lucide-react-native';
import { extractErrorMessage } from '@/lib/errorUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/state/auth-store';
import { useTheme } from '@/lib/theme/ThemeContext';

const CURRENCY_OPTIONS = ['AED', 'SAR', 'USD', 'EUR', 'GBP', 'QAR', 'BHD', 'KWD', 'OMR', 'EGP', 'INR', 'PKR', 'PHP', 'AUD', 'CAD'];
const DELIVERY_IMPACT_OPTIONS = ['No impact', '+1 day', '+2 days', '+3 days', '+5 days', '+7 days'];
const DEPOSIT_PERCENT_OPTIONS = ['25% upfront', '50% upfront', '75% upfront', '100% upfront'];
const CANCELLATION_OPTIONS = ['12 hours before', '24 hours before', '48 hours before', '72 hours before'];

// Types
interface PackageInclusion {
  text: string;
}

interface PackageDeliverable {
  text: string;
}

interface PackageTravelFeeRules {
  enabled: boolean;
  flat_fee: number;
}

interface PackageAddon {
  id: string;
  name: string;
  description?: string;
  price: number;
  delivery_impact: string;
}

interface PackageInstantBookTerms {
  deposit_percent: number;
  cancellation_hours: number;
  auto_confirm: boolean;
}

interface Package {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  currency: string;
  duration_hours: number;
  revisions_included: number;
  inclusions_json?: string;
  deliverables_json?: string;
  travel_fee_rules_json?: string;
  addons_json?: string;
  instant_book_terms_json?: string;
  instant_book_enabled: boolean;
  is_active: boolean;
  overtime_rate_per_hour?: number;
  rush_fee?: number;
  talent_id: string;
  created_at?: string;
  updated_at?: string;
}

interface FormData {
  name: string;
  description: string;
  basePrice: string;
  currency: string;
  durationHours: string;
  revisionsIncluded: string;
  inclusionsText: string;
  deliverablesText: string;
  overtimeRate: string;
  rushFee: string;
  flatTravelFee: string;
  instantBookEnabled: boolean;
  instantBookDeposit: string;
  instantBookCancellation: string;
  instantBookAutoConfirm: boolean;
  addons: PackageAddon[];
}

const defaultFormData: FormData = {
  name: '',
  description: '',
  basePrice: '',
  currency: 'USD',
  durationHours: '',
  revisionsIncluded: '',
  inclusionsText: '',
  deliverablesText: '',
  overtimeRate: '',
  rushFee: '',
  flatTravelFee: '',
  instantBookEnabled: false,
  instantBookDeposit: '50% upfront',
  instantBookCancellation: '48 hours before',
  instantBookAutoConfirm: false,
  addons: [],
};

// Helper: Parse JSON safely
function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

// Header Component
function Header({ isDark }: { isDark: boolean }) {
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
  };

  return (
    <View style={[styles.stickyHeader, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => router.replace('/(talent)/profile')}
        style={[styles.backButton, { backgroundColor: isDark ? '#1A1A1A' : '#f3f4f6' }]}
      >
        <ArrowLeft size={20} color={colors.textSecondary} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Packages</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

// Loading State
function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      {[1, 2, 3].map((i) => (
        <View key={`skeleton-${i}`} style={styles.skeletonCard} />
      ))}
    </View>
  );
}

// Empty State
function EmptyState({ onCreatePress, isDark }: { onCreatePress: () => void; isDark: boolean }) {
  const colors = {
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    text: isDark ? '#ffffff' : '#111827',
  };

  return (
    <View style={[styles.emptyStateCard, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.emptyIconBox}>
        <PackageIcon size={28} color={colors.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No packages yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Create packages to offer your services with fixed pricing
      </Text>
      <Pressable style={styles.emptyButton} onPress={onCreatePress}>
        <Plus size={20} color="#ffffff" />
        <Text style={styles.emptyButtonText}>Create Your First Package</Text>
      </Pressable>
    </View>
  );
}

// Package Card
function PackageCard({
  pkg,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  pkg: Package;
  onEdit: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
  onToggleActive: (pkg: Package) => void;
}) {
  const inclusions = safeJsonParse<string[]>(
    pkg.inclusions_json,
    []
  );

  return (
    <View style={[styles.packageCard, !pkg.is_active && styles.inactiveCard]}>
      {/* Top Row */}
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.packageName}>{pkg.name}</Text>
            {!pkg.is_active ? (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            ) : null}
            {pkg.instant_book_enabled ? (
              <View style={styles.instantBadge}>
                <Zap size={10} color="#fa5610" />
                <Text style={styles.instantBadgeText}>Instant</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.packageDescription} numberOfLines={2}>
            {pkg.description || 'No description'}
          </Text>
        </View>
        <Text style={styles.packagePrice}>
          {pkg.currency} {pkg.base_price.toLocaleString()}
        </Text>
      </View>

      {/* Info Row */}
      <View style={styles.infoRow}>
        <Clock size={14} color="#6b7280" />
        <Text style={styles.infoText}>{pkg.duration_hours}h</Text>
        <Text style={styles.infoDot}>•</Text>
        <Text style={styles.infoText}>
          {pkg.revisions_included} revisions
        </Text>
      </View>

      {/* Inclusions Row */}
      {inclusions.length > 0 && (
        <View style={styles.inclusionsRow}>
          {inclusions.slice(0, 3).map((inclusion) => (
            <View key={inclusion} style={styles.inclusionBadge}>
              <Text style={styles.inclusionText}>{inclusion}</Text>
            </View>
          ))}
          {inclusions.length > 3 && (
            <View style={styles.moreBadge}>
              <Text style={styles.moreText}>+{inclusions.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.toggleButton}
          onPress={() => onToggleActive(pkg)}
        >
          {pkg.is_active ? (
            <>
              <ToggleRight size={20} color="#10b981" />
              <Text style={styles.toggleText}>Active</Text>
            </>
          ) : (
            <>
              <ToggleLeft size={20} color="#6b7280" />
              <Text style={styles.toggleText}>Inactive</Text>
            </>
          )}
        </Pressable>
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.editButton}
            onPress={() => onEdit(pkg)}
          >
            <Edit size={14} color="#6b7280" />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => onDelete(pkg)}
          >
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Collapsible Section
function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Pressable
        style={styles.collapsibleHeader}
        onPress={onToggle}
      >
        <View style={styles.collapsibleHeaderLeft}>
          <Icon size={18} color="#6b7280" />
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.collapsibleTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.collapsibleSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#6b7280"
        />
      </Pressable>
      {isOpen ? <View style={styles.collapsibleContent}>{children}</View> : null}
    </View>
  );
}

// Currency Picker
function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <Pressable
        style={styles.currencyPickerButton}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={styles.currencyPickerText}>{value}</Text>
        <Ionicons
          name={showPicker ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#6b7280"
        />
      </Pressable>
      {showPicker ? (
        <View style={styles.currencyDropdown}>
          {CURRENCY_OPTIONS.map((curr) => (
            <Pressable
              key={curr}
              style={styles.currencyOption}
              onPress={() => {
                onChange(curr);
                setShowPicker(false);
              }}
            >
              <Text
                style={[
                  styles.currencyOptionText,
                  curr === value && styles.currencyOptionTextActive,
                ]}
              >
                {curr}
              </Text>
              {curr === value && (
                <Ionicons name="checkmark" size={16} color="#fa5610" />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

// Delivery Impact Picker
function DeliveryImpactPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <Pressable
        style={styles.pickerButton}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={styles.pickerButtonText}>{value}</Text>
        <Ionicons
          name={showPicker ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#6b7280"
        />
      </Pressable>
      {showPicker ? (
        <View style={styles.dropdown}>
          {DELIVERY_IMPACT_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              style={styles.dropdownOption}
              onPress={() => {
                onChange(opt);
                setShowPicker(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  opt === value && styles.dropdownOptionTextActive,
                ]}
              >
                {opt}
              </Text>
              {opt === value && (
                <Ionicons name="checkmark" size={16} color="#fa5610" />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

// Main Screen
export default function ManagePackagesScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();

  // State
  const [talentProfileId, setTalentProfileId] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // Collapsible states
  const [showExtraFees, setShowExtraFees] = useState(false);
  const [showTravelFees, setShowTravelFees] = useState(false);
  const [showAddons, setShowAddons] = useState(false);

  // Travel fee state
  const [travelFeeEnabled, setTravelFeeEnabled] = useState(false);

  // Add-on being edited
  const [editingAddonIdx, setEditingAddonIdx] = useState<number | null>(null);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonDesc, setNewAddonDesc] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');
  const [newAddonDeliveryImpact, setNewAddonDeliveryImpact] = useState('No impact');

  const fetchPackages = useCallback(async () => {
    if (!talentProfileId) {
      console.warn('[ManagePackages] No talent profile ID available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('talent_id', talentProfileId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ManagePackages] Error fetching packages:', extractErrorMessage(error));
        setPackages([]);
        setIsLoading(false);
        return;
      }

      setPackages((data as Package[]) || []);
    } catch (err) {
      console.error('[ManagePackages] Error:', err);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, [talentProfileId]);

  const initializeTalentProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('[ManagePackages] Error fetching talent profile:', extractErrorMessage(error));
        return;
      }

      if (!data?.id) {
        console.warn('[ManagePackages] No talent profile found for user:', user?.id);
        return;
      }

      setTalentProfileId(data.id);
    } catch (err) {
      console.error('[ManagePackages] Error initializing:', err);
    }
  }, [user?.id]);

  // Fetch packages on mount
  useEffect(() => {
    if (user?.id) {
      initializeTalentProfile();
    }
  }, [user?.id, initializeTalentProfile]);

  // Fetch packages when talent profile ID is available
  useEffect(() => {
    if (talentProfileId) {
      fetchPackages();
    }
  }, [talentProfileId, fetchPackages]);

  const resetForm = useCallback(() => {
    setFormData(defaultFormData);
    setShowExtraFees(false);
    setShowTravelFees(false);
    setShowAddons(false);
    setTravelFeeEnabled(false);
    setEditingAddonIdx(null);
    setNewAddonName('');
    setNewAddonDesc('');
    setNewAddonPrice('');
    setNewAddonDeliveryImpact('No impact');
  }, []);

  const openEditSheet = useCallback((pkg: Package) => {
    setEditingPackage(pkg);

    // Parse JSON fields
    const inclusions = safeJsonParse<string[]>(pkg.inclusions_json, []);
    const deliverables = safeJsonParse<string[]>(pkg.deliverables_json, []);
    const travelRules = safeJsonParse<PackageTravelFeeRules>(
      pkg.travel_fee_rules_json,
      { enabled: false, flat_fee: 0 }
    );
    const instantTerms = safeJsonParse<PackageInstantBookTerms>(
      pkg.instant_book_terms_json,
      {
        deposit_percent: 50,
        cancellation_hours: 48,
        auto_confirm: false,
      }
    );
    const addons = safeJsonParse<PackageAddon[]>(pkg.addons_json, []);

    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      basePrice: pkg.base_price.toString(),
      currency: pkg.currency,
      durationHours: pkg.duration_hours.toString(),
      revisionsIncluded: pkg.revisions_included.toString(),
      inclusionsText: inclusions.join('\n'),
      deliverablesText: deliverables.join('\n'),
      overtimeRate: pkg.overtime_rate_per_hour?.toString() || '',
      rushFee: pkg.rush_fee?.toString() || '',
      flatTravelFee: travelRules.flat_fee?.toString() || '',
      instantBookEnabled: pkg.instant_book_enabled,
      instantBookDeposit: `${instantTerms.deposit_percent}% upfront`,
      instantBookCancellation: `${instantTerms.cancellation_hours} hours before`,
      instantBookAutoConfirm: instantTerms.auto_confirm,
      addons,
    });

    setTravelFeeEnabled(travelRules.enabled);
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate
    if (!formData.name.trim() || !formData.basePrice) {
      Alert.alert('Validation', 'Package name and base price are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const inclusions = formData.inclusionsText
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const deliverables = formData.deliverablesText
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const travelRules: PackageTravelFeeRules = {
        enabled: travelFeeEnabled,
        flat_fee: travelFeeEnabled ? parseFloat(formData.flatTravelFee) || 0 : 0,
      };

      // Extract deposit percent number
      const depositMatch = formData.instantBookDeposit.match(/(\d+)/);
      const depositPercent = depositMatch ? parseInt(depositMatch[1], 10) : 50;

      // Extract cancellation hours
      const cancellationMatch = formData.instantBookCancellation.match(/(\d+)/);
      const cancellationHours = cancellationMatch
        ? parseInt(cancellationMatch[1], 10)
        : 48;

      const instantTerms: PackageInstantBookTerms = {
        deposit_percent: depositPercent,
        cancellation_hours: cancellationHours,
        auto_confirm: formData.instantBookAutoConfirm,
      };

      const packageData = {
        name: formData.name,
        description: formData.description,
        base_price: Math.round(parseFloat(formData.basePrice) || 0),
        currency: formData.currency,
        duration_hours: parseInt(formData.durationHours, 10) || 1,
        revisions_included: parseInt(formData.revisionsIncluded, 10) || 0,
        inclusions_json: JSON.stringify(inclusions),
        deliverables_json: JSON.stringify(deliverables),
        travel_fee_rules_json: JSON.stringify(travelRules),
        overtime_rate: formData.overtimeRate
          ? Math.round(parseFloat(formData.overtimeRate))
          : null,
        rush_fee: formData.rushFee ? Math.round(parseFloat(formData.rushFee)) : null,
        instant_book_enabled: formData.instantBookEnabled,
        instant_book_terms_json: formData.instantBookEnabled
          ? JSON.stringify(instantTerms)
          : null,
        addons_json: formData.addons.length > 0
          ? JSON.stringify(formData.addons)
          : null,
      };


      if (editingPackage) {
        // UPDATE
        const { error } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) {
          console.error('Update error:', extractErrorMessage(error));
          console.error('Update error message:', error?.message);
          console.error('Update error code:', error?.code);
          Alert.alert('Error', `Failed to update package: ${error?.message || 'Unknown error'}`);
          return;
        }

        Alert.alert('Success', 'Package updated successfully');
      } else {
        // INSERT
        if (!talentProfileId) {
          Alert.alert('Error', 'Talent profile not found. Please complete your profile first.');
          console.error('[ManagePackages] No talent profile ID available');
          return;
        }

        const { error } = await supabase
          .from('packages')
          .insert([{ ...packageData, talent_id: talentProfileId }]);

        if (error) {
          console.error('Insert error:', extractErrorMessage(error));
          console.error('Insert error message:', error?.message);
          console.error('Insert error code:', error?.code);
          Alert.alert('Error', `Failed to create package: ${error?.message || 'Unknown error'}`);
          return;
        }

        Alert.alert('Success', 'Package created successfully');
      }

      // Refresh and close
      await fetchPackages();
      setShowForm(false);
      setEditingPackage(null);
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingPackage, talentProfileId, fetchPackages, resetForm, travelFeeEnabled]);

  const handleDelete = useCallback((pkg: Package) => {
    Alert.alert('Delete Package', 'Are you sure you want to delete this package?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('packages')
              .delete()
              .eq('id', pkg.id);

            if (error) {
              Alert.alert('Error', 'Failed to delete package');
              return;
            }

            await fetchPackages();
            Alert.alert('Success', 'Package deleted');
          } catch (err) {
            Alert.alert('Error', 'Something went wrong');
          }
        },
      },
    ]);
  }, [fetchPackages]);

  const handleToggleActive = useCallback(
    async (pkg: Package) => {
      try {
        const { error } = await supabase
          .from('packages')
          .update({ is_active: !pkg.is_active })
          .eq('id', pkg.id);

        if (error) {
          Alert.alert('Error', 'Failed to update package status');
          return;
        }

        await fetchPackages();
      } catch (err) {
        Alert.alert('Error', 'Something went wrong');
      }
    },
    [fetchPackages]
  );

  // Add-on functions
  const addNewAddon = useCallback(() => {
    if (!newAddonName.trim() || !newAddonPrice) {
      Alert.alert('Validation', 'Add-on name and price are required');
      return;
    }

    const addon: PackageAddon = {
      id: Date.now().toString(),
      name: newAddonName,
      description: newAddonDesc,
      price: parseFloat(newAddonPrice),
      delivery_impact: newAddonDeliveryImpact,
    };

    if (editingAddonIdx !== null) {
      const updated = [...formData.addons];
      updated[editingAddonIdx] = addon;
      setFormData({ ...formData, addons: updated });
      setEditingAddonIdx(null);
    } else {
      setFormData({ ...formData, addons: [...formData.addons, addon] });
    }

    setNewAddonName('');
    setNewAddonDesc('');
    setNewAddonPrice('');
    setNewAddonDeliveryImpact('No impact');
  }, [newAddonName, newAddonPrice, newAddonDesc, newAddonDeliveryImpact, editingAddonIdx, formData]);

  const removeAddon = useCallback(
    (idx: number) => {
      const updated = formData.addons.filter((_, i) => i !== idx);
      setFormData({ ...formData, addons: updated });
    },
    [formData]
  );

  const editAddon = useCallback(
    (idx: number) => {
      const addon = formData.addons[idx];
      setNewAddonName(addon.name);
      setNewAddonDesc(addon.description || '');
      setNewAddonPrice(addon.price.toString());
      setNewAddonDeliveryImpact(addon.delivery_impact);
      setEditingAddonIdx(idx);
    },
    [formData.addons]
  );

  // Dynamic colors based on theme
  const colors = {
    bg: isDark ? '#0A0A0A' : '#ffffff',
    bgSecondary: isDark ? '#1A1A1A' : '#f9fafb',
    text: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    border: isDark ? '#374151' : '#e5e7eb',
    borderLight: isDark ? '#2d2d2d' : '#f3f4f6',
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
        <Header isDark={isDark} />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <Header isDark={isDark} />

      {packages.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContent}
        >
          <EmptyState
            onCreatePress={() => {
              resetForm();
              setEditingPackage(null);
              setShowForm(true);
            }}
            isDark={isDark}
          />
        </ScrollView>
      ) : (
        <View style={styles.listContainer}>
          <View style={styles.newPackageButtonContainer}>
            <Pressable
              style={styles.newPackageButton}
              onPress={() => {
                resetForm();
                setEditingPackage(null);
                setShowForm(true);
              }}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.newPackageButtonText}>New Package</Text>
            </Pressable>
          </View>

          <FlatList
            data={packages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PackageCard
                pkg={item}
                onEdit={openEditSheet}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            )}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />

          <View style={{ height: 100 }} />
        </View>
      )}

      {/* FORM MODAL */}
      <Modal visible={showForm} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.formSheet, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>
                  {editingPackage ? 'Edit Package' : 'Create Package'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {editingPackage
                    ? 'Update your package details'
                    : 'Define a service package with fixed pricing'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowForm(false);
                  setEditingPackage(null);
                  resetForm();
                }}
                style={styles.formCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
            >
              {/* Package Name */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>
                  Package Name<Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Half Day Shoot"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Description */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaInput]}
                  placeholder="Describe what's included in this package..."
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price + Currency Grid */}
              <View style={styles.gridContainer}>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>
                    Base Price<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.basePrice}
                    onChangeText={(text) =>
                      setFormData({ ...formData, basePrice: text })
                    }
                    keyboardType="number-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <CurrencyPicker
                    value={formData.currency}
                    onChange={(curr) =>
                      setFormData({ ...formData, currency: curr })
                    }
                  />
                </View>
              </View>

              {/* Duration + Revisions Grid */}
              <View style={styles.gridContainer}>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Duration (hours)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.durationHours}
                    onChangeText={(text) =>
                      setFormData({ ...formData, durationHours: text })
                    }
                    keyboardType="number-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Revisions Included</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.revisionsIncluded}
                    onChangeText={(text) =>
                      setFormData({ ...formData, revisionsIncluded: text })
                    }
                    keyboardType="number-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* What's Included */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>What's Included</Text>
                <TextInput
                  style={[styles.input, styles.textAreaInput]}
                  placeholder={
                    'Professional lighting\nOn-set direction\nMultiple outfit changes'
                  }
                  value={formData.inclusionsText}
                  onChangeText={(text) =>
                    setFormData({ ...formData, inclusionsText: text })
                  }
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Deliverables */}
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Deliverables</Text>
                <TextInput
                  style={[styles.input, styles.textAreaInput]}
                  placeholder={
                    '15 edited photos\nHigh-res downloads\nSocial media crops'
                  }
                  value={formData.deliverablesText}
                  onChangeText={(text) =>
                    setFormData({ ...formData, deliverablesText: text })
                  }
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Extra Fees */}
              <CollapsibleSection
                title="Extra Fees"
                subtitle="Overtime & rush delivery rates"
                icon={Clock}
                isOpen={showExtraFees}
                onToggle={() => setShowExtraFees(!showExtraFees)}
              >
                <View style={styles.collapsibleInner}>
                  <Text style={styles.formLabel}>
                    Overtime Rate (per hour)
                  </Text>
                  <View style={styles.suffixContainer}>
                    <TextInput
                      style={[styles.input, styles.suffixInput]}
                      placeholder="0"
                      value={formData.overtimeRate}
                      onChangeText={(text) =>
                        setFormData({ ...formData, overtimeRate: text })
                      }
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                    />
                    <View style={styles.suffixBadge}>
                      <Text style={styles.suffixText}>
                        {formData.currency}/hr
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    Charged for work beyond the package duration
                  </Text>

                  <Text style={[styles.formLabel, { marginTop: 16 }]}>
                    Rush Fee
                  </Text>
                  <View style={styles.suffixContainer}>
                    <TextInput
                      style={[styles.input, styles.suffixInput]}
                      placeholder="0"
                      value={formData.rushFee}
                      onChangeText={(text) =>
                        setFormData({ ...formData, rushFee: text })
                      }
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                    />
                    <View style={styles.suffixBadge}>
                      <Text style={styles.suffixText}>
                        {formData.currency}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    Additional charge for last-minute bookings (less than 48
                    hours notice)
                  </Text>
                </View>
              </CollapsibleSection>

              {/* Travel Fees */}
              <CollapsibleSection
                title="Travel Fees"
                subtitle="Charge for on-location work"
                icon={Car}
                isOpen={showTravelFees}
                onToggle={() => setShowTravelFees(!showTravelFees)}
              >
                <View style={styles.collapsibleInner}>
                  <View style={styles.toggleRow}>
                    <View>
                      <Text style={styles.toggleLabel}>Enable Travel Fee</Text>
                      <Text style={styles.toggleHelper}>
                        Charge clients for travel to locations
                      </Text>
                    </View>
                    <Switch
                      value={travelFeeEnabled}
                      onValueChange={setTravelFeeEnabled}
                      trackColor={{ false: '#e5e7eb', true: '#d1d5db' }}
                      thumbColor={travelFeeEnabled ? '#fa5610' : '#ffffff'}
                    />
                  </View>

                  {travelFeeEnabled ? (
                    <>
                      <Text style={[styles.formLabel, { marginTop: 16 }]}>
                        Flat Travel Fee
                      </Text>
                      <View style={styles.suffixContainer}>
                        <TextInput
                          style={[styles.input, styles.suffixInput]}
                          placeholder="0"
                          value={formData.flatTravelFee}
                          onChangeText={(text) =>
                            setFormData({
                              ...formData,
                              flatTravelFee: text,
                            })
                          }
                          keyboardType="number-pad"
                          placeholderTextColor="#9ca3af"
                        />
                        <View style={styles.suffixBadge}>
                          <Text style={styles.suffixText}>
                            {formData.currency}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              </CollapsibleSection>

              {/* Custom Add-ons */}
              <CollapsibleSection
                title="Custom Add-ons"
                subtitle={
                  formData.addons.length > 0
                    ? `${formData.addons.length} add-on(s) configured`
                    : 'Offer additional services to clients'
                }
                icon={Gift}
                isOpen={showAddons}
                onToggle={() => setShowAddons(!showAddons)}
              >
                <View style={styles.collapsibleInner}>
                  {formData.addons.map((addon, idx) => (
                    <View key={addon.id} style={styles.addonCard}>
                      <View style={styles.addonHeader}>
                        <Text style={styles.addonTitle}>
                          Add-on {idx + 1}
                        </Text>
                        <Pressable
                          onPress={() => removeAddon(idx)}
                          style={styles.addonDeleteButton}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                      </View>

                      <View style={styles.addonContent}>
                        <Text style={styles.formLabel}>Name</Text>
                        <Text style={styles.addonValue}>{addon.name}</Text>

                        {addon.description ? (
                          <>
                            <Text style={[styles.formLabel, { marginTop: 8 }]}>
                              Description
                            </Text>
                            <Text style={styles.addonValue}>
                              {addon.description}
                            </Text>
                          </>
                        ) : null}

                        <View style={[styles.gridContainer, { marginTop: 8 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.formLabel}>Price</Text>
                            <Text style={styles.addonValue}>
                              {formData.currency} {addon.price}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.formLabel}>Delivery Impact</Text>
                            <Text style={styles.addonValue}>
                              {addon.delivery_impact}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          style={styles.addonEditButton}
                          onPress={() => editAddon(idx)}
                        >
                          <Edit size={14} color="#6b7280" />
                          <Text style={styles.addonEditButtonText}>Edit</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

                  <View style={styles.addonFormCard}>
                    <Text style={styles.formLabel}>
                      {editingAddonIdx !== null
                        ? 'Edit Add-on'
                        : 'Add New Add-on'}
                    </Text>

                    <Text style={[styles.formLabel, { marginTop: 12 }]}>
                      Name<Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Extra Retouching"
                      value={newAddonName}
                      onChangeText={setNewAddonName}
                      placeholderTextColor="#9ca3af"
                    />

                    <Text style={[styles.formLabel, { marginTop: 12 }]}>
                      Description (optional)
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textAreaInput]}
                      placeholder="Additional details about this add-on"
                      value={newAddonDesc}
                      onChangeText={setNewAddonDesc}
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={2}
                    />

                    <View style={styles.gridContainer}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { marginTop: 12 }]}>
                          Price<Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.suffixContainer}>
                          <TextInput
                            style={[styles.input, styles.suffixInput]}
                            placeholder="0"
                            value={newAddonPrice}
                            onChangeText={setNewAddonPrice}
                            keyboardType="number-pad"
                            placeholderTextColor="#9ca3af"
                          />
                          <View style={styles.suffixBadge}>
                            <Text style={styles.suffixText}>
                              {formData.currency}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.formLabel, { marginTop: 12 }]}>
                          Delivery Impact
                        </Text>
                        <DeliveryImpactPicker
                          value={newAddonDeliveryImpact}
                          onChange={setNewAddonDeliveryImpact}
                        />
                      </View>
                    </View>

                    <Pressable
                      style={styles.addAddonButton}
                      onPress={addNewAddon}
                    >
                      <Plus size={16} color="#ffffff" />
                      <Text style={styles.addAddonButtonText}>
                        {editingAddonIdx !== null
                          ? 'Update Add-on'
                          : formData.addons.length > 0
                            ? 'Add Another Add-on'
                            : 'Add an Add-on'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </CollapsibleSection>

              {/* Instant Book */}
              <View style={styles.formSection}>
                <View style={styles.instantBookToggle}>
                  <View style={styles.instantBookLeft}>
                    <Zap size={18} color="#fa5610" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.toggleLabel}>Instant Book</Text>
                      <Text style={styles.toggleHelper}>
                        Allow clients to book instantly
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={formData.instantBookEnabled}
                    onValueChange={(val) =>
                      setFormData({ ...formData, instantBookEnabled: val })
                    }
                    trackColor={{ false: '#e5e7eb', true: '#d1d5db' }}
                    thumbColor={
                      formData.instantBookEnabled ? '#fa5610' : '#ffffff'
                    }
                  />
                </View>

                {formData.instantBookEnabled ? (
                  <View style={styles.instantBookSettings}>
                    <View style={styles.infoBox}>
                      <AlertCircle size={16} color="#fa5610" />
                      <Text style={styles.infoText}>
                        Configure how instant bookings work for this package
                      </Text>
                    </View>

                    <Text style={[styles.formLabel, { marginTop: 16 }]}>
                      Deposit Required (%)
                    </Text>
                    <Pressable
                      style={styles.pickerButton}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          instantBookDeposit: formData.instantBookDeposit,
                        })
                      }
                    >
                      <Text style={styles.pickerButtonText}>
                        {formData.instantBookDeposit}
                      </Text>
                    </Pressable>

                    <Text style={[styles.formLabel, { marginTop: 12 }]}>
                      Free Cancellation Window
                    </Text>
                    <Pressable
                      style={styles.pickerButton}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          instantBookCancellation:
                            formData.instantBookCancellation,
                        })
                      }
                    >
                      <Text style={styles.pickerButtonText}>
                        {formData.instantBookCancellation}
                      </Text>
                    </Pressable>
                    <Text style={styles.helperText}>
                      Clients can cancel for free within this window
                    </Text>

                    <View style={[styles.toggleRow, { marginTop: 16 }]}>
                      <View>
                        <Text style={styles.toggleLabel}>
                          Auto-confirm Bookings
                        </Text>
                        <Text style={styles.toggleHelper}>
                          Bookings are confirmed automatically
                        </Text>
                      </View>
                      <Switch
                        value={formData.instantBookAutoConfirm}
                        onValueChange={(val) =>
                          setFormData({
                            ...formData,
                            instantBookAutoConfirm: val,
                          })
                        }
                        trackColor={{ false: '#e5e7eb', true: '#d1d5db' }}
                        thumbColor={
                          formData.instantBookAutoConfirm
                            ? '#fa5610'
                            : '#ffffff'
                        }
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.formFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowForm(false);
                  setEditingPackage(null);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                  (!formData.name.trim() || !formData.basePrice) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || !formData.name.trim() || !formData.basePrice}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator size={16} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Saving...</Text>
                  </>
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingPackage ? 'Update Package' : 'Create Package'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  skeletonCard: {
    height: 128,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    marginBottom: 12,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyStateCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#fa5610',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  listContainer: {
    flex: 1,
  },
  newPackageButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newPackageButton: {
    backgroundColor: '#fa5610',
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  newPackageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  scrollView: {
    flex: 1,
  },
  packageCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  inactiveBadge: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
  },
  instantBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instantBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fa5610',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoDot: {
    fontSize: 12,
    color: '#6b7280',
  },
  inclusionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  inclusionBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  inclusionText: {
    fontSize: 10,
    color: '#6b7280',
  },
  moreBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  moreText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
  },
  actionBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  collapsibleSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  collapsibleContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginTop: 0,
  },
  collapsibleInner: {
    gap: 12,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    height: 44,
  },
  textAreaInput: {
    height: undefined,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyPickerButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currencyPickerText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  currencyDropdown: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 100,
  },
  currencyOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  currencyOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  currencyOptionTextActive: {
    color: '#fa5610',
    fontWeight: '600',
  },
  suffixContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  suffixInput: {
    flex: 1,
  },
  suffixBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  suffixText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  toggleHelper: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  addonCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  addonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  addonDeleteButton: {
    padding: 4,
  },
  addonContent: {
    gap: 8,
  },
  addonValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  addonEditButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addonEditButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  addonFormCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  addAddonButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.02)',
  },
  addAddonButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fa5610',
  },
  instantBookToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  instantBookLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  instantBookSettings: {
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 8,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dropdownOptionTextActive: {
    color: '#fa5610',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  formSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    flexDirection: 'column',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  formCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#fa5610',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
