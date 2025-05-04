import axios from 'axios';
import axiosInstance from '@/lib/axiosInstance';

/**
 * Utility functions for interacting with attribute groups API
 */

/**
 * Update an attribute group's basic information (name, order)
 * @param groupId The ID of the group to update
 * @param data The data to update (name and/or order)
 */
export const updateAttributeGroup = async (groupId: number, data: { 
  name?: string;
  order?: number;
}) => {
  const response = await axiosInstance.patch(`/api/attribute-groups/${groupId}/`, {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.order !== undefined && { order: data.order })
  });
  return response.data;
};

/**
 * Reorder the items within an attribute group
 * @param groupId The ID of the group to update
 * @param itemIds An array of item IDs in the desired order
 */
export const reorderAttributeGroupItems = async (groupId: number, itemIds: number[]) => {
  const response = await axiosInstance.post(`/api/attribute-groups/${groupId}/reorder_items/`, {
    item_ids: itemIds
  });
  return response.data;
};

/**
 * Add an attribute to a group
 * @param groupId The ID of the group to add to
 * @param attributeId The ID of the attribute to add
 */
export const addAttributeToGroup = async (groupId: number, attributeId: number) => {
  const response = await axiosInstance.post(`/api/attribute-groups/${groupId}/add-item/`, {
    attribute: attributeId
  });
  return response.data;
};

/**
 * Remove an attribute from a group
 * @param groupId The ID of the group to remove from
 * @param itemId The ID of the group item to remove
 */
export const removeAttributeFromGroup = async (groupId: number, itemId: number) => {
  const response = await axiosInstance.delete(`/api/attribute-groups/${groupId}/items/${itemId}/`);
  return response.data;
};

/**
 * Reorder all attribute groups
 * @param groupIds An array of group IDs in the desired order
 */
export const reorderAttributeGroups = async (groupIds: number[]) => {
  const response = await axiosInstance.post(`/api/attribute-groups/reorder/`, {
    group_ids: groupIds
  });
  return response.data;
};

/**
 * Create a new attribute group
 * @param data The data for the new group
 */
export const createAttributeGroup = async (data: {
  name: string;
  order?: number;
}) => {
  const response = await axiosInstance.post(`/api/attribute-groups/`, {
    name: data.name,
    ...(data.order !== undefined && { order: data.order })
  });
  return response.data;
};

/**
 * Delete an attribute group
 * @param groupId The ID of the group to delete
 */
export const deleteAttributeGroup = async (groupId: number) => {
  const response = await axiosInstance.delete(`/api/attribute-groups/${groupId}/`);
  return response.data;
}; 