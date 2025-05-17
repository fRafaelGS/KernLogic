# KernLogic Data Model

This document was automatically generated from the OpenAPI specification.

## Table of Contents

- [ActionEnum](#schema-actionenum)
- [AssetBundle](#schema-assetbundle)
- [AssetBundleRequest](#schema-assetbundlerequest)
- [Attribute](#schema-attribute)
- [AttributeGroup](#schema-attributegroup)
- [AttributeGroupItem](#schema-attributegroupitem)
- [AttributeGroupItemRequest](#schema-attributegroupitemrequest)
- [AttributeGroupRequest](#schema-attributegrouprequest)
- [AttributeRequest](#schema-attributerequest)
- [AttributeValue](#schema-attributevalue)
- [AttributeValueDetail](#schema-attributevaluedetail)
- [AttributeValueRequest](#schema-attributevaluerequest)
- [AuditLog](#schema-auditlog)
- [Category](#schema-category)
- [CategoryRequest](#schema-categoryrequest)
- [Currency](#schema-currency)
- [CurrencyRequest](#schema-currencyrequest)
- [DataTypeEnum](#schema-datatypeenum)
- [DuplicateStrategyEnum](#schema-duplicatestrategyenum)
- [Family](#schema-family)
- [FamilyAttributeGroup](#schema-familyattributegroup)
- [FamilyAttributeGroupRequest](#schema-familyattributegrouprequest)
- [FamilyRequest](#schema-familyrequest)
- [ImportTask](#schema-importtask)
- [ImportTaskRequest](#schema-importtaskrequest)
- [ImportTaskStatusEnum](#schema-importtaskstatusenum)
- [Locale](#schema-locale)
- [LocaleRequest](#schema-localerequest)
- [Membership](#schema-membership)
- [MembershipRequest](#schema-membershiprequest)
- [MembershipStatusEnum](#schema-membershipstatusenum)
- [PaginatedProductEventList](#schema-paginatedproducteventlist)
- [PaginatedProductList](#schema-paginatedproductlist)
- [PatchedAssetBundleRequest](#schema-patchedassetbundlerequest)
- [PatchedAttributeGroupRequest](#schema-patchedattributegrouprequest)
- [PatchedAttributeRequest](#schema-patchedattributerequest)
- [PatchedAttributeValueRequest](#schema-patchedattributevaluerequest)
- [PatchedCategoryRequest](#schema-patchedcategoryrequest)
- [PatchedCurrencyRequest](#schema-patchedcurrencyrequest)
- [PatchedFamilyRequest](#schema-patchedfamilyrequest)
- [PatchedLocaleRequest](#schema-patchedlocalerequest)
- [PatchedMembershipRequest](#schema-patchedmembershiprequest)
- [PatchedPriceTypeRequest](#schema-patchedpricetyperequest)
- [PatchedProductAssetRequest](#schema-patchedproductassetrequest)
- [PatchedProductRequest](#schema-patchedproductrequest)
- [PatchedRoleRequest](#schema-patchedrolerequest)
- [PatchedSalesChannelRequest](#schema-patchedsaleschannelrequest)
- [PriceType](#schema-pricetype)
- [PriceTypeRequest](#schema-pricetyperequest)
- [Product](#schema-product)
- [ProductActivity](#schema-productactivity)
- [ProductAsset](#schema-productasset)
- [ProductAssetRequest](#schema-productassetrequest)
- [ProductEvent](#schema-productevent)
- [ProductEventRequest](#schema-producteventrequest)
- [ProductFamilyOverride](#schema-productfamilyoverride)
- [ProductFamilyOverrideRequest](#schema-productfamilyoverriderequest)
- [ProductPrice](#schema-productprice)
- [ProductPriceRequest](#schema-productpricerequest)
- [ProductRequest](#schema-productrequest)
- [ReportTheme](#schema-reporttheme)
- [Role](#schema-role)
- [RoleRequest](#schema-rolerequest)
- [SalesChannel](#schema-saleschannel)
- [SalesChannelRequest](#schema-saleschannelrequest)
- [TokenObtainPair](#schema-tokenobtainpair)
- [TokenObtainPairRequest](#schema-tokenobtainpairrequest)
- [TokenRefresh](#schema-tokenrefresh)
- [TokenRefreshRequest](#schema-tokenrefreshrequest)
- [User](#schema-user)

## Schema: ActionEnum

* `invite` - Invite Sent
* `role_change` - Role Changed
* `remove` - User Removed

| Field | Type | Description |
| ----- | ---- | ----------- |
| *No properties defined* | | |



## Schema: AssetBundle

| Field | Type | Description |
| ----- | ---- | ----------- |
| asset_ids | array<integer> |  |
| created_at | string |  |
| id | integer |  |
| name | string |  |

**Required fields:** asset_ids, created_at, id, name


## Schema: AssetBundleRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| asset_ids | array<integer> |  |
| name | string |  |

**Required fields:** asset_ids, name


## Schema: Attribute

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string | Slug-like unique identifier per organization |
| created_by | integer |  |
| data_type | DataTypeEnum |  |
| id | integer |  |
| is_localisable | boolean |  |
| is_scopable | boolean |  |
| label | string |  |
| options | string |  |
| organization | integer |  |

**Required fields:** code, created_by, data_type, id, label, options, organization


## Schema: AttributeGroup

| Field | Type | Description |
| ----- | ---- | ----------- |
| id | integer |  |
| items | array<AttributeGroupItem> |  |
| name | string |  |
| order | integer |  |

**Required fields:** id, name


## Schema: AttributeGroupItem

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute | integer |  |
| id | integer |  |
| order | integer |  |

**Required fields:** attribute, id


## Schema: AttributeGroupItemRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute | integer |  |
| order | integer |  |

**Required fields:** attribute


## Schema: AttributeGroupRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| items | array<AttributeGroupItemRequest> |  |
| name | string |  |
| order | integer |  |

**Required fields:** name


## Schema: AttributeRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string | Slug-like unique identifier per organization |
| data_type | DataTypeEnum |  |
| is_localisable | boolean |  |
| is_scopable | boolean |  |
| label | string |  |

**Required fields:** code, data_type, label


## Schema: AttributeValue

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute | integer |  |
| channel | string |  |
| created_by | integer |  |
| id | integer |  |
| locale | integer | The locale for this attribute value |
| locale_code | string | Legacy locale code field, use 'locale' instead |
| organization | integer |  |
| product | integer |  |
| value | object |  |

**Required fields:** attribute, created_by, id, organization, product, value


## Schema: AttributeValueDetail

Serializer for attribute values with more detailed attribute information.
Used for list and retrieve actions.

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute | integer |  |
| attribute_code | string |  |
| attribute_label | string |  |
| attribute_type | string |  |
| channel | string |  |
| id | integer |  |
| locale | integer | The locale for this attribute value |
| organization | integer |  |
| product | integer |  |
| value | object |  |

**Required fields:** attribute, attribute_code, attribute_label, attribute_type, id, organization, product, value


## Schema: AttributeValueRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute | integer |  |
| channel | string |  |
| locale | integer | The locale for this attribute value |
| locale_code | string | Legacy locale code field, use 'locale' instead |
| product | integer |  |
| value | object |  |

**Required fields:** attribute, product, value


## Schema: AuditLog

| Field | Type | Description |
| ----- | ---- | ----------- |
| action | ActionEnum |  |
| details | object |  |
| id | integer |  |
| organization | integer |  |
| target_id | string |  |
| target_type | string |  |
| timestamp | string |  |
| user | integer |  |

**Required fields:** action, id, target_id, target_type, timestamp


## Schema: Category

Serializer for hierarchical category model

| Field | Type | Description |
| ----- | ---- | ----------- |
| children | string |  |
| id | integer |  |
| name | string |  |
| parent | integer |  |

**Required fields:** children, id, name


## Schema: CategoryRequest

Serializer for hierarchical category model

| Field | Type | Description |
| ----- | ---- | ----------- |
| name | string |  |
| parent | integer |  |

**Required fields:** name


## Schema: Currency

| Field | Type | Description |
| ----- | ---- | ----------- |
| decimals | integer |  |
| iso_code | string |  |
| name | string |  |
| symbol | string |  |

**Required fields:** iso_code, name, symbol


## Schema: CurrencyRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| decimals | integer |  |
| name | string |  |
| symbol | string |  |

**Required fields:** name, symbol


## Schema: DataTypeEnum

* `text` - Text
* `number` - Number
* `boolean` - Boolean
* `date` - Date
* `select` - Select
* `rich_text` - Rich Text
* `price` - Price
* `media` - Media
* `measurement` - Measurement
* `url` - URL
* `email` - Email
* `phone` - Phone

| Field | Type | Description |
| ----- | ---- | ----------- |
| *No properties defined* | | |



## Schema: DuplicateStrategyEnum

* `skip` - Skip
* `overwrite` - Overwrite
* `abort` - Abort

| Field | Type | Description |
| ----- | ---- | ----------- |
| *No properties defined* | | |



## Schema: Family

Serializer for Product Family model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_groups | array<FamilyAttributeGroup> |  |
| code | string |  |
| created_at | string |  |
| description | string |  |
| id | integer |  |
| label | string |  |
| updated_at | string |  |

**Required fields:** code, created_at, id, label, updated_at


## Schema: FamilyAttributeGroup

Serializer for the FamilyAttributeGroup pivot model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_group | integer |  |
| id | integer |  |
| order | integer |  |
| required | boolean |  |

**Required fields:** attribute_group, id


## Schema: FamilyAttributeGroupRequest

Serializer for the FamilyAttributeGroup pivot model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_group | integer |  |
| order | integer |  |
| required | boolean |  |

**Required fields:** attribute_group


## Schema: FamilyRequest

Serializer for Product Family model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_groups | array<FamilyAttributeGroupRequest> |  |
| code | string |  |
| description | string |  |
| label | string |  |

**Required fields:** code, label


## Schema: ImportTask

Serializer for the ImportTask model.
Includes calculated fields for progress percentage and status display.

| Field | Type | Description |
| ----- | ---- | ----------- |
| created_at | string |  |
| csv_file | string |  |
| duplicate_strategy | any | Strategy for handling duplicate SKUs  * `skip` - Skip * `overwrite` - Overwrite * `abort` - Abort |
| error_file | string |  |
| error_file_url | string |  |
| execution_time | number | Execution time in seconds |
| id | integer |  |
| mapping | object |  |
| processed | integer |  |
| progress_percentage | integer |  |
| status | any |  |
| status_display | string |  |
| total_rows | integer |  |

**Required fields:** created_at, csv_file, error_file, error_file_url, execution_time, id, mapping, processed, progress_percentage, status, status_display, total_rows


## Schema: ImportTaskRequest

Serializer for the ImportTask model.
Includes calculated fields for progress percentage and status display.

| Field | Type | Description |
| ----- | ---- | ----------- |
| csv_file | string |  |
| duplicate_strategy | any | Strategy for handling duplicate SKUs  * `skip` - Skip * `overwrite` - Overwrite * `abort` - Abort |
| mapping | object |  |

**Required fields:** csv_file, mapping


## Schema: ImportTaskStatusEnum

* `queued` - Queued
* `running` - Running
* `success` - Success
* `partial_success` - Partial Success
* `error` - Error

| Field | Type | Description |
| ----- | ---- | ----------- |
| *No properties defined* | | |



## Schema: Locale

Serializer for the Locale model

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| id | integer |  |
| is_active | boolean |  |
| label | string |  |

**Required fields:** code, id, label


## Schema: LocaleRequest

Serializer for the Locale model

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| is_active | boolean |  |
| label | string |  |

**Required fields:** code, label


## Schema: Membership

| Field | Type | Description |
| ----- | ---- | ----------- |
| avatar_url | string |  |
| id | integer |  |
| invited_at | string |  |
| organization | integer |  |
| role | any |  |
| role_id | integer |  |
| status | MembershipStatusEnum |  |
| user | string |  |
| user_email | string |  |
| user_name | string |  |

**Required fields:** avatar_url, id, invited_at, role, role_id, user, user_email, user_name


## Schema: MembershipRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| organization | integer |  |
| role_id | integer |  |
| status | MembershipStatusEnum |  |

**Required fields:** role_id


## Schema: MembershipStatusEnum

* `pending` - Pending
* `active` - Active

| Field | Type | Description |
| ----- | ---- | ----------- |
| *No properties defined* | | |



## Schema: PaginatedProductEventList

| Field | Type | Description |
| ----- | ---- | ----------- |
| count | integer |  |
| next | string |  |
| previous | string |  |
| results | array<ProductEvent> |  |


## Schema: PaginatedProductList

| Field | Type | Description |
| ----- | ---- | ----------- |
| count | integer |  |
| next | string |  |
| previous | string |  |
| results | array<Product> |  |


## Schema: PatchedAssetBundleRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| asset_ids | array<integer> |  |
| name | string |  |


## Schema: PatchedAttributeGroupRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| items | array<AttributeGroupItemRequest> |  |
| name | string |  |
| order | integer |  |


## Schema: PatchedAttributeRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string | Slug-like unique identifier per organization |
| data_type | DataTypeEnum |  |
| is_localisable | boolean |  |
| is_scopable | boolean |  |
| label | string |  |


## Schema: PatchedAttributeValueRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute | integer |  |
| channel | string |  |
| locale | integer | The locale for this attribute value |
| locale_code | string | Legacy locale code field, use 'locale' instead |
| product | integer |  |
| value | object |  |


## Schema: PatchedCategoryRequest

Serializer for hierarchical category model

| Field | Type | Description |
| ----- | ---- | ----------- |
| name | string |  |
| parent | integer |  |


## Schema: PatchedCurrencyRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| decimals | integer |  |
| name | string |  |
| symbol | string |  |


## Schema: PatchedFamilyRequest

Serializer for Product Family model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_groups | array<FamilyAttributeGroupRequest> |  |
| code | string |  |
| description | string |  |
| label | string |  |


## Schema: PatchedLocaleRequest

Serializer for the Locale model

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| is_active | boolean |  |
| label | string |  |


## Schema: PatchedMembershipRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| organization | integer |  |
| role_id | integer |  |
| status | MembershipStatusEnum |  |


## Schema: PatchedPriceTypeRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| label | string |  |


## Schema: PatchedProductAssetRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| asset_type | string | Type of asset (image, video, document, etc.) |
| content_type | string | MIME type of the file |
| file | string |  |
| file_size | integer | Size of the file in bytes |
| is_primary | boolean | Is this the main asset for the product? |
| name | string |  |
| order | integer | Order in which assets are displayed |
| tags | array<string> |  |
| uploaded_by | integer |  |


## Schema: PatchedProductRequest

Serializer for Product model

| Field | Type | Description |
| ----- | ---- | ----------- |
| barcode | string |  |
| brand | string |  |
| category_id | integer |  |
| description | string |  |
| family | integer |  |
| is_active | boolean |  |
| is_archived | boolean |  |
| name | string |  |
| sku | string |  |
| tags | array<string> |  |


## Schema: PatchedRoleRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| description | string |  |
| name | string |  |
| permissions | object |  |


## Schema: PatchedSalesChannelRequest

Serializer for sales channels

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| description | string |  |
| is_active | boolean |  |
| name | string |  |


## Schema: PriceType

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| id | integer |  |
| label | string |  |

**Required fields:** code, id, label


## Schema: PriceTypeRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| label | string |  |

**Required fields:** code, label


## Schema: Product

Serializer for Product model

| Field | Type | Description |
| ----- | ---- | ----------- |
| assets | string |  |
| attribute_values | string |  |
| barcode | string |  |
| brand | string |  |
| category | string |  |
| completeness_percent | string |  |
| created_at | string |  |
| created_by | string |  |
| description | string |  |
| effective_attribute_groups | string |  |
| family | integer |  |
| family_overrides | array<ProductFamilyOverride> |  |
| id | integer |  |
| is_active | boolean |  |
| is_archived | boolean |  |
| missing_fields | string |  |
| name | string |  |
| organization | integer |  |
| prices | array<ProductPrice> |  |
| primary_asset | string |  |
| sku | string |  |
| tags | array<string> |  |
| updated_at | string |  |

**Required fields:** assets, attribute_values, category, completeness_percent, created_at, created_by, effective_attribute_groups, family_overrides, id, missing_fields, name, organization, prices, primary_asset, sku, updated_at


## Schema: ProductActivity

| Field | Type | Description |
| ----- | ---- | ----------- |
| details | string |  |
| id | integer |  |
| timestamp | string |  |
| type | string |  |
| user | string |  |

**Required fields:** details, id, timestamp, type, user


## Schema: ProductAsset

| Field | Type | Description |
| ----- | ---- | ----------- |
| asset_type | string | Type of asset (image, video, document, etc.) |
| content_type | string | MIME type of the file |
| file | string |  |
| file_size | integer | Size of the file in bytes |
| file_size_formatted | string |  |
| file_url | string |  |
| id | integer |  |
| is_primary | boolean | Is this the main asset for the product? |
| name | string |  |
| order | integer | Order in which assets are displayed |
| product | integer |  |
| tags | array<string> |  |
| uploaded_at | string |  |
| uploaded_by | integer |  |
| uploaded_by_name | string |  |

**Required fields:** file, file_size_formatted, file_url, id, product, uploaded_at, uploaded_by_name


## Schema: ProductAssetRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| asset_type | string | Type of asset (image, video, document, etc.) |
| content_type | string | MIME type of the file |
| file | string |  |
| file_size | integer | Size of the file in bytes |
| is_primary | boolean | Is this the main asset for the product? |
| name | string |  |
| order | integer | Order in which assets are displayed |
| tags | array<string> |  |
| uploaded_by | integer |  |

**Required fields:** file


## Schema: ProductEvent

| Field | Type | Description |
| ----- | ---- | ----------- |
| created_at | string |  |
| created_by_name | string |  |
| event_type | string |  |
| id | integer |  |
| payload | object |  |
| summary | string |  |

**Required fields:** created_at, created_by_name, event_type, id, summary


## Schema: ProductEventRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| event_type | string |  |
| payload | object |  |
| summary | string |  |

**Required fields:** event_type, summary


## Schema: ProductFamilyOverride

Serializer for Product Family Override model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_group | integer |  |
| id | integer |  |
| removed | boolean |  |

**Required fields:** attribute_group, id


## Schema: ProductFamilyOverrideRequest

Serializer for Product Family Override model

| Field | Type | Description |
| ----- | ---- | ----------- |
| attribute_group | integer |  |
| removed | boolean |  |

**Required fields:** attribute_group


## Schema: ProductPrice

Serializer for product prices (unified payload)

| Field | Type | Description |
| ----- | ---- | ----------- |
| amount | string |  |
| channel | any |  |
| created_at | string |  |
| currency | string |  |
| id | integer |  |
| label | string |  |
| price_type | string |  |
| price_type_display | string |  |
| updated_at | string |  |
| valid_from | string |  |
| valid_to | string |  |

**Required fields:** amount, channel, created_at, currency, id, label, price_type, price_type_display, updated_at


## Schema: ProductPriceRequest

Serializer for product prices (unified payload)

| Field | Type | Description |
| ----- | ---- | ----------- |
| amount | string |  |
| channel_id | integer |  |
| currency | string |  |
| price_type | string |  |
| valid_from | string |  |
| valid_to | string |  |

**Required fields:** amount, currency, price_type


## Schema: ProductRequest

Serializer for Product model

| Field | Type | Description |
| ----- | ---- | ----------- |
| barcode | string |  |
| brand | string |  |
| category_id | integer |  |
| description | string |  |
| family | integer |  |
| is_active | boolean |  |
| is_archived | boolean |  |
| name | string |  |
| sku | string |  |
| tags | array<string> |  |

**Required fields:** name, sku


## Schema: ReportTheme

| Field | Type | Description |
| ----- | ---- | ----------- |
| description | string |  |
| name | string |  |
| slug | string |  |

**Required fields:** name, slug


## Schema: Role

| Field | Type | Description |
| ----- | ---- | ----------- |
| description | string |  |
| id | integer |  |
| name | string |  |
| permissions | object |  |

**Required fields:** id, name


## Schema: RoleRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| description | string |  |
| name | string |  |
| permissions | object |  |

**Required fields:** name


## Schema: SalesChannel

Serializer for sales channels

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| description | string |  |
| id | integer |  |
| is_active | boolean |  |
| name | string |  |

**Required fields:** code, id, name


## Schema: SalesChannelRequest

Serializer for sales channels

| Field | Type | Description |
| ----- | ---- | ----------- |
| code | string |  |
| description | string |  |
| is_active | boolean |  |
| name | string |  |

**Required fields:** code, name


## Schema: TokenObtainPair

| Field | Type | Description |
| ----- | ---- | ----------- |
| access | string |  |
| refresh | string |  |

**Required fields:** access, refresh


## Schema: TokenObtainPairRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| email | string |  |
| password | string |  |

**Required fields:** email, password


## Schema: TokenRefresh

| Field | Type | Description |
| ----- | ---- | ----------- |
| access | string |  |
| refresh | string |  |

**Required fields:** access, refresh


## Schema: TokenRefreshRequest

| Field | Type | Description |
| ----- | ---- | ----------- |
| refresh | string |  |

**Required fields:** refresh


## Schema: User

| Field | Type | Description |
| ----- | ---- | ----------- |
| avatar_url | string |  |
| email | string |  |
| id | integer |  |
| is_active | boolean |  |
| is_staff | boolean | Designates whether the user can log into this admin site. |
| is_superuser | boolean | Designates that this user has all permissions without explicitly assigning them. |
| name | string |  |
| organization_id | string |  |
| role | string |  |

**Required fields:** avatar_url, email, id, is_active, is_staff, is_superuser, name, organization_id, role


