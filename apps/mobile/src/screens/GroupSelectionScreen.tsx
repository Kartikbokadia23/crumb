import React, { useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SplitwiseGroup } from '@crumb/splitwise'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Typography } from '../theme/typography'
import { useSplitwiseContext } from '../context/SplitwiseContext'
import { RootStackParamList } from '../navigation/AppNavigator'

type Props = NativeStackScreenProps<RootStackParamList, 'GroupSelection'>

export function GroupSelectionScreen({ navigation }: Props) {
  const { state, selectGroup } = useSplitwiseContext()

  const handleSelect = useCallback(
    async (group: SplitwiseGroup) => {
      await selectGroup(group.id)
      navigation.goBack()
    },
    [selectGroup, navigation],
  )

  // Only accessible when connected
  if (state.type !== 'connected') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.acid} size="large" />
        <Text style={[Typography.body, styles.waitText]}>Loading groups...</Text>
      </View>
    )
  }

  const { groups, selectedGroupId } = state

  const renderGroup = ({ item }: { item: SplitwiseGroup }) => {
    const isSelected = item.id === selectedGroupId
    const memberCount = item.members ? item.members.length : 0

    return (
      <TouchableOpacity
        style={[styles.groupCard, isSelected && styles.groupCardSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${item.name}, ${memberCount} members${isSelected ? ', selected' : ''}`}
      >
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, isSelected && styles.groupNameSelected]}>
            {item.name}
          </Text>
          {memberCount > 0 && (
            <Text style={styles.memberCount}>
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {isSelected && (
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const ListHeader = (
    <View style={styles.listHeaderContainer}>
      <Text style={Typography.heading}>Select Group</Text>
      <Text style={styles.subtitle}>
        Choose which Splitwise group to post Crumb expenses to
      </Text>
    </View>
  )

  const ListEmpty = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No groups found</Text>
      <Text style={styles.emptySubtitle}>
        Create a group in Splitwise first, then come back to select it.
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={groups}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGroup}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paper,
    gap: Spacing.md,
  },
  waitText: {
    color: Colors.muted,
  },
  listContent: {
    padding: Spacing.screenPadding,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  listHeaderContainer: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 20,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  groupCardSelected: {
    borderColor: Colors.acid,
    backgroundColor: '#F9FFED',
  },
  groupInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
  },
  groupNameSelected: {
    color: Colors.ink,
  },
  memberCount: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '500',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.acid,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.ink,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
})
