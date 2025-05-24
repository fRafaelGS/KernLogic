import { KernLogicAPIClient } from "./kernLogicAPI.ts";

const baseUrl = "<BASE_URL>";
const kernLogicAPIClient = new KernLogicAPIClient({ baseUrl });

export default function () {
  let tokenObtainPairRequest,
    tokenRefreshRequest,
    orgId,
    membershipId,
    productRequest,
    id,
    patchedProductRequest,
    priceId,
    relatedId,
    attributeName,
    productPk,
    productEventRequest,
    attributeRequest,
    patchedAttributeRequest,
    attributeGroupRequest,
    patchedAttributeGroupRequest,
    itemId,
    categoryRequest,
    patchedCategoryRequest,
    familyRequest,
    patchedFamilyRequest,
    groupId,
    localeRequest,
    patchedLocaleRequest,
    salesChannelRequest,
    patchedSalesChannelRequest,
    productAssetRequest,
    patchedProductAssetRequest,
    assetBundleRequest,
    patchedAssetBundleRequest,
    attributeValueRequest,
    patchedAttributeValueRequest,
    productFamilyOverrideRequest,
    productId,
    productsOverrideGroupCreateBody,
    params,
    importTaskRequest,
    patchedImportTaskRequest,
    roleRequest,
    patchedRoleRequest,
    membershipRequest,
    patchedMembershipRequest,
    currencyRequest,
    isoCode,
    patchedCurrencyRequest,
    priceTypeRequest,
    patchedPriceTypeRequest;

  /**
   *
   */
  tokenObtainPairRequest = {
    email: "murky",
    password: "gum",
  };

  const tokenCreateResponseData = kernLogicAPIClient.tokenCreate(
    tokenObtainPairRequest,
  );

  /**
   *
   */
  tokenRefreshRequest = {
    refresh: "unless",
  };

  const tokenRefreshCreateResponseData =
    kernLogicAPIClient.tokenRefreshCreate(tokenRefreshRequest);

  /**
   *
   */
  orgId = 2305762275303625;

  const orgsRetrieveResponseData = kernLogicAPIClient.orgsRetrieve(orgId);

  /**
   *
   */
  orgId = 1601198260459548;

  const orgsPartialUpdateResponseData =
    kernLogicAPIClient.orgsPartialUpdate(orgId);

  /**
   *
   */
  orgId = 5136405791992528;

  const organizationsRetrieveResponseData =
    kernLogicAPIClient.organizationsRetrieve(orgId);

  /**
   *
   */
  orgId = 3986057675429068;

  const organizationsPartialUpdateResponseData =
    kernLogicAPIClient.organizationsPartialUpdate(orgId);

  /**
   *
   */
  orgId = 7619410958792499;
  membershipId = 7890299984038287;

  const orgsMembershipsAvatarRetrieveResponseData =
    kernLogicAPIClient.orgsMembershipsAvatarRetrieve(orgId, membershipId);

  /**
   *
   */
  orgId = 6439305859963373;
  membershipId = 1863072148079205;

  const orgsMembershipsAvatarDestroyResponseData =
    kernLogicAPIClient.orgsMembershipsAvatarDestroy(orgId, membershipId);

  /**
   *
   */
  orgId = 38055958331018;
  membershipId = 1973126190620247;

  const orgsMembershipsAvatarCreateResponseData =
    kernLogicAPIClient.orgsMembershipsAvatarCreate(orgId, membershipId);

  /**
   *
   */

  const analyticsCompletenessExportRetrieveResponseData =
    kernLogicAPIClient.analyticsCompletenessExportRetrieve();

  /**
   *
   */

  const analyticsReadinessExportRetrieveResponseData =
    kernLogicAPIClient.analyticsReadinessExportRetrieve();

  /**
   *
   */

  const analyticsEnrichmentVelocityExportRetrieveResponseData =
    kernLogicAPIClient.analyticsEnrichmentVelocityExportRetrieve();

  /**
   *
   */

  const analyticsLocalizationQualityExportRetrieveResponseData =
    kernLogicAPIClient.analyticsLocalizationQualityExportRetrieve();

  /**
   *
   */

  const analyticsChangeHistoryExportRetrieveResponseData =
    kernLogicAPIClient.analyticsChangeHistoryExportRetrieve();

  /**
   *
   */

  const importsFieldSchemaRetrieveResponseData =
    kernLogicAPIClient.importsFieldSchemaRetrieve();

  /**
   *
   */

  const importsAttributeGroupsSchemaRetrieveResponseData =
    kernLogicAPIClient.importsAttributeGroupsSchemaRetrieve();

  /**
   *
   */

  const importsAttributesSchemaRetrieveResponseData =
    kernLogicAPIClient.importsAttributesSchemaRetrieve();

  /**
   *
   */

  const importsFamiliesSchemaRetrieveResponseData =
    kernLogicAPIClient.importsFamiliesSchemaRetrieve();

  /**
   *
   */

  const productsListResponseData = kernLogicAPIClient.productsList();

  /**
   *
   */
  productRequest = {
    name: "dreamily",
    sku: "sympathetically",
    description: "unless",
    brand: "underneath",
    barcode: "trusting",
    tags: [],
    is_active: false,
    is_archived: false,
    family: 5130767448452524,
  };

  const productsCreateResponseData =
    kernLogicAPIClient.productsCreate(productRequest);

  /**
   *
   */

  const productsBrandsRetrieveResponseData =
    kernLogicAPIClient.productsBrandsRetrieve();

  /**
   *
   */
  productRequest = {
    name: "times",
    sku: "hourly",
    description: "uh-huh",
    brand: "owlishly",
    barcode: "obedience",
    tags: [],
    is_active: false,
    is_archived: false,
    family: 4924193037458270,
  };

  const productsBulkCreateCreateResponseData =
    kernLogicAPIClient.productsBulkCreateCreate(productRequest);

  /**
   *
   */
  productRequest = {
    name: "doubtfully",
    sku: "gadzooks",
    description: "agile",
    brand: "about",
    barcode: "what",
    tags: [],
    is_active: false,
    is_archived: false,
    family: 7491918812729688,
  };

  const productsBulkDeleteCreateResponseData =
    kernLogicAPIClient.productsBulkDeleteCreate(productRequest);

  /**
   *
   */
  productRequest = {
    name: "ouch",
    sku: "and",
    description: "jazz",
    brand: "delicious",
    barcode: "conservation",
    tags: [],
    is_active: false,
    is_archived: true,
    family: 106874328223486,
  };

  const productsBulkUpdateCreateResponseData =
    kernLogicAPIClient.productsBulkUpdateCreate(productRequest);

  /**
   *
   */

  const productsCategoriesRetrieveResponseData =
    kernLogicAPIClient.productsCategoriesRetrieve();

  /**
   *
   */
  productRequest = {
    name: "affiliate",
    sku: "creator",
    description: "vice",
    brand: "supplier",
    barcode: "brr",
    tags: [],
    is_active: false,
    is_archived: false,
    family: 2985999234258035,
  };

  const productsCategoriesCreateResponseData =
    kernLogicAPIClient.productsCategoriesCreate(productRequest);

  /**
   *
   */
  productRequest = {
    name: "furthermore",
    sku: "reprimand",
    description: "till",
    brand: "through",
    barcode: "orient",
    tags: [],
    is_active: true,
    is_archived: true,
    family: 1986112127673838,
  };

  const productsCleanupCategoryPlaceholdersCreateResponseData =
    kernLogicAPIClient.productsCleanupCategoryPlaceholdersCreate(
      productRequest,
    );

  /**
   *
   */

  const productsSalesChannelsRetrieveResponseData =
    kernLogicAPIClient.productsSalesChannelsRetrieve();

  /**
   *
   */
  productRequest = {
    name: "postbox",
    sku: "elastic",
    description: "yet",
    brand: "creamy",
    barcode: "accidentally",
    tags: [],
    is_active: true,
    is_archived: false,
    family: 5322670709061127,
  };

  const productsSalesChannelsCreateResponseData =
    kernLogicAPIClient.productsSalesChannelsCreate(productRequest);

  /**
   *
   */

  const productsStatsRetrieveResponseData =
    kernLogicAPIClient.productsStatsRetrieve();

  /**
   *
   */

  const productsTagsRetrieveResponseData =
    kernLogicAPIClient.productsTagsRetrieve();

  /**
   *
   */
  productRequest = {
    name: "however",
    sku: "because",
    description: "as",
    brand: "unless",
    barcode: "usefully",
    tags: [],
    is_active: false,
    is_archived: false,
    family: 3224811026398872,
  };

  const productsTagsCreateResponseData =
    kernLogicAPIClient.productsTagsCreate(productRequest);

  /**
   *
   */
  id = 6121402871633274;
  patchedProductRequest = {
    name: "psst",
    sku: "swift",
    description: "loose",
    brand: "scruple",
    barcode: "tough",
    tags: [],
    is_active: true,
    is_archived: true,
    family: 942015433967482,
  };

  const productsPartialUpdateResponseData =
    kernLogicAPIClient.productsPartialUpdate(id, patchedProductRequest);

  /**
   *
   */
  id = 2145759742409536;

  const productsRetrieveResponseData = kernLogicAPIClient.productsRetrieve(id);

  /**
   *
   */
  id = 5827003428057380;

  const productsDestroyResponseData = kernLogicAPIClient.productsDestroy(id);

  /**
   *
   */
  id = 6009414746105286;
  productRequest = {
    name: "bell",
    sku: "exempt",
    description: "because",
    brand: "helpfully",
    barcode: "before",
    tags: [],
    is_active: true,
    is_archived: true,
    family: 2259510107135434,
  };

  const productsRelatedAddCreateResponseData =
    kernLogicAPIClient.productsRelatedAddCreate(id, productRequest);

  /**
   *
   */
  id = 6306240725371728;

  const productsExplicitRelationsRetrieveResponseData =
    kernLogicAPIClient.productsExplicitRelationsRetrieve(id);

  /**
   *
   */
  id = 578758561096812;
  priceId = 6924607890016604;
  patchedProductRequest = {
    name: "yum",
    sku: "truly",
    description: "incline",
    brand: "lazily",
    barcode: "intellect",
    tags: [],
    is_active: false,
    is_archived: true,
    family: 4405872180576966,
  };

  const productsPricesPartialUpdateResponseData =
    kernLogicAPIClient.productsPricesPartialUpdate(
      id,
      priceId,
      patchedProductRequest,
    );

  /**
   *
   */
  id = 7298299691866819;
  priceId = 1108191061834460;

  const productsPricesRetrieve2ResponseData =
    kernLogicAPIClient.productsPricesRetrieve2(id, priceId);

  /**
   *
   */
  id = 2081262235840286;
  priceId = 5714502824033790;

  const productsPricesDestroyResponseData =
    kernLogicAPIClient.productsPricesDestroy(id, priceId);

  /**
   *
   */
  id = 717099247073309;
  relatedId = 7346719192387784;
  patchedProductRequest = {
    name: "trivial",
    sku: "mob",
    description: "vet",
    brand: "conceal",
    barcode: "behind",
    tags: [],
    is_active: false,
    is_archived: false,
    family: 2397009491564071,
  };

  const productsRelatedPartialUpdateResponseData =
    kernLogicAPIClient.productsRelatedPartialUpdate(
      id,
      relatedId,
      patchedProductRequest,
    );

  /**
   *
   */
  id = 651644325540539;
  relatedId = 8831961420590338;

  const productsRelatedDestroyResponseData =
    kernLogicAPIClient.productsRelatedDestroy(id, relatedId);

  /**
   *
   */
  id = 4053995596635225;

  const productsPricesRetrieveResponseData =
    kernLogicAPIClient.productsPricesRetrieve(id);

  /**
   *
   */
  id = 2788954801855659;
  productRequest = {
    name: "guilty",
    sku: "although",
    description: "of",
    brand: "phooey",
    barcode: "down",
    tags: [],
    is_active: false,
    is_archived: true,
    family: 2910165248137465,
  };

  const productsPricesCreateResponseData =
    kernLogicAPIClient.productsPricesCreate(id, productRequest);

  /**
   *
   */
  id = 5808620797781511;

  const productsRelatedListRetrieveResponseData =
    kernLogicAPIClient.productsRelatedListRetrieve(id);

  /**
   *
   */
  id = 8091578818169235;

  const productsRelatedProductsRetrieveResponseData =
    kernLogicAPIClient.productsRelatedProductsRetrieve(id);

  /**
   *
   */
  id = 2462625083082727;
  productRequest = {
    name: "steep",
    sku: "wisely",
    description: "unless",
    brand: "though",
    barcode: "kiddingly",
    tags: [],
    is_active: true,
    is_archived: false,
    family: 3651844563122917,
  };

  const productsSetPrimaryCreateResponseData =
    kernLogicAPIClient.productsSetPrimaryCreate(id, productRequest);

  /**
   *
   */

  const dashboardActivityRetrieveResponseData =
    kernLogicAPIClient.dashboardActivityRetrieve();

  /**
   *
   */

  const dashboardAutoEnrichCreateResponseData =
    kernLogicAPIClient.dashboardAutoEnrichCreate();

  /**
   *
   */

  const dashboardFamilyCompletenessRetrieveResponseData =
    kernLogicAPIClient.dashboardFamilyCompletenessRetrieve();

  /**
   *
   */

  const dashboardIncompleteProductsRetrieveResponseData =
    kernLogicAPIClient.dashboardIncompleteProductsRetrieve();

  /**
   *
   */

  const dashboardInventoryTrendRetrieveResponseData =
    kernLogicAPIClient.dashboardInventoryTrendRetrieve();

  /**
   *
   */

  const dashboardRequiredAttributesRetrieveResponseData =
    kernLogicAPIClient.dashboardRequiredAttributesRetrieve();

  /**
   *
   */

  const dashboardSummaryRetrieveResponseData =
    kernLogicAPIClient.dashboardSummaryRetrieve();

  /**
   *
   */
  id = "um";
  attributeName = "geez";

  const dashboardEnrichCreateResponseData =
    kernLogicAPIClient.dashboardEnrichCreate(id, attributeName);

  /**
   *
   */
  productPk = "optimal";

  const productsHistoryListResponseData =
    kernLogicAPIClient.productsHistoryList(productPk);

  /**
   *
   */
  productPk = 7199772448000958;
  id = 3542513000379264;
  productEventRequest = {
    event_type: "severe",
    summary: "uh-huh",
    payload: {},
  };

  const productsHistoryRollbackCreateResponseData =
    kernLogicAPIClient.productsHistoryRollbackCreate(
      productPk,
      id,
      productEventRequest,
    );

  /**
   *
   */
  id = "lender";

  const attributeSetsRetrieveResponseData =
    kernLogicAPIClient.attributeSetsRetrieve(id);

  /**
   * List all attributes
   */

  const attributesListResponseData = kernLogicAPIClient.attributesList();

  /**
   * Create a new attribute
   */
  attributeRequest = {
    code: "reproachfully",
    label: "slink",
    data_type: "text",
    is_localisable: true,
    is_scopable: false,
  };

  const attributesCreateResponseData =
    kernLogicAPIClient.attributesCreate(attributeRequest);

  /**
   * Partially update an attribute
   */
  id = 939526528403435;
  patchedAttributeRequest = {
    code: "recompense",
    label: "yahoo",
    data_type: "text",
    is_localisable: false,
    is_scopable: true,
  };

  const attributesPartialUpdateResponseData =
    kernLogicAPIClient.attributesPartialUpdate(id, patchedAttributeRequest);

  /**
   * Get a specific attribute
   */
  id = 5773978381777456;

  const attributesRetrieveResponseData =
    kernLogicAPIClient.attributesRetrieve(id);

  /**
   * Update an attribute
   */
  id = 351288661291982;
  attributeRequest = {
    code: "aboard",
    label: "furthermore",
    data_type: "text",
    is_localisable: true,
    is_scopable: true,
  };

  const attributesUpdateResponseData = kernLogicAPIClient.attributesUpdate(
    id,
    attributeRequest,
  );

  /**
   * Delete an attribute
   */
  id = 740487496298459;

  const attributesDestroyResponseData =
    kernLogicAPIClient.attributesDestroy(id);

  /**
   * List attribute groups
   */

  const attributeGroupsListResponseData =
    kernLogicAPIClient.attributeGroupsList();

  /**
   * Create a new attribute group
   */
  attributeGroupRequest = {
    name: "weep",
    order: 2026776975766931,
    items: [],
  };

  const attributeGroupsCreateResponseData =
    kernLogicAPIClient.attributeGroupsCreate(attributeGroupRequest);

  /**
   *
   */
  attributeGroupRequest = {
    name: "slather",
    order: 8370483377399850,
    items: [],
  };

  const attributeGroupsReorderCreateResponseData =
    kernLogicAPIClient.attributeGroupsReorderCreate(attributeGroupRequest);

  /**
   * Partially update an attribute group
   */
  id = 635171476824531;
  patchedAttributeGroupRequest = {
    name: "till",
    order: 5140806351702027,
    items: [],
  };

  const attributeGroupsPartialUpdateResponseData =
    kernLogicAPIClient.attributeGroupsPartialUpdate(
      id,
      patchedAttributeGroupRequest,
    );

  /**
   * Get a specific attribute group
   */
  id = 513680823557308;

  const attributeGroupsRetrieveResponseData =
    kernLogicAPIClient.attributeGroupsRetrieve(id);

  /**
   * Update an attribute group
   */
  id = 1440228520387891;
  attributeGroupRequest = {
    name: "dense",
    order: 3654082331487257,
    items: [],
  };

  const attributeGroupsUpdateResponseData =
    kernLogicAPIClient.attributeGroupsUpdate(id, attributeGroupRequest);

  /**
   * Delete an attribute group
   */
  id = 4390437514731563;

  const attributeGroupsDestroyResponseData =
    kernLogicAPIClient.attributeGroupsDestroy(id);

  /**
   *
   */
  id = 2799902544518266;
  attributeGroupRequest = {
    name: "reproachfully",
    order: 4549942849900647,
    items: [],
  };

  const attributeGroupsAddItemCreateResponseData =
    kernLogicAPIClient.attributeGroupsAddItemCreate(id, attributeGroupRequest);

  /**
   *
   */
  id = 3824146645513184;
  itemId = 4367303431196099;

  const attributeGroupsItemsDestroyResponseData =
    kernLogicAPIClient.attributeGroupsItemsDestroy(id, itemId);

  /**
   *
   */
  id = 1257928949477529;
  attributeGroupRequest = {
    name: "how",
    order: 76260583202866,
    items: [],
  };

  const attributeGroupsReorderItemsCreateResponseData =
    kernLogicAPIClient.attributeGroupsReorderItemsCreate(
      id,
      attributeGroupRequest,
    );

  /**
   * List all categories
   */

  const categoriesListResponseData = kernLogicAPIClient.categoriesList();

  /**
   * Create a new category
   */
  categoryRequest = {
    name: "till",
    parent: 3322595591073436,
  };

  const categoriesCreateResponseData =
    kernLogicAPIClient.categoriesCreate(categoryRequest);

  /**
   *
   */
  categoryRequest = {
    name: "tectonics",
    parent: 6906931688162902,
  };

  const categoriesMoveCreateResponseData =
    kernLogicAPIClient.categoriesMoveCreate(categoryRequest);

  /**
   * Partially update a category
   */
  id = 5001064109047040;
  patchedCategoryRequest = {
    name: "blah",
    parent: 7549542466253727,
  };

  const categoriesPartialUpdateResponseData =
    kernLogicAPIClient.categoriesPartialUpdate(id, patchedCategoryRequest);

  /**
   * Get a specific category
   */
  id = 2168472969395492;

  const categoriesRetrieveResponseData =
    kernLogicAPIClient.categoriesRetrieve(id);

  /**
   * Delete a category
   */
  id = 1228444365519646;

  const categoriesDestroyResponseData =
    kernLogicAPIClient.categoriesDestroy(id);

  /**
   *
   */
  id = 8462085048067739;

  const categoriesProductsRetrieveResponseData =
    kernLogicAPIClient.categoriesProductsRetrieve(id);

  /**
   * List product families
   */

  const familiesListResponseData = kernLogicAPIClient.familiesList();

  /**
   * Create a new product family
   */
  familyRequest = {
    code: "anxiously",
    label: "intently",
    description: "agile",
    attribute_groups: [],
  };

  const familiesCreateResponseData =
    kernLogicAPIClient.familiesCreate(familyRequest);

  /**
   * Partially update a product family
   */
  id = 2638797738490433;
  patchedFamilyRequest = {
    code: "opposite",
    label: "throughout",
    description: "smoggy",
    attribute_groups: [],
  };

  const familiesPartialUpdateResponseData =
    kernLogicAPIClient.familiesPartialUpdate(id, patchedFamilyRequest);

  /**
   * Get a specific product family
   */
  id = 5028419829900789;

  const familiesRetrieveResponseData = kernLogicAPIClient.familiesRetrieve(id);

  /**
   * Update a product family
   */
  id = 934246112161211;
  familyRequest = {
    code: "anti",
    label: "once",
    description: "jovially",
    attribute_groups: [],
  };

  const familiesUpdateResponseData = kernLogicAPIClient.familiesUpdate(
    id,
    familyRequest,
  );

  /**
   * Delete a product family
   */
  id = 2493601706461005;

  const familiesDestroyResponseData = kernLogicAPIClient.familiesDestroy(id);

  /**
   *
   */
  id = 4418210555464150;
  familyRequest = {
    code: "airmail",
    label: "deer",
    description: "quietly",
    attribute_groups: [],
  };

  const familiesBulkAttributeGroupsCreateResponseData =
    kernLogicAPIClient.familiesBulkAttributeGroupsCreate(id, familyRequest);

  /**
   *
   */
  id = 4946284951497053;
  familyRequest = {
    code: "diversity",
    label: "pace",
    description: "feline",
    attribute_groups: [],
  };

  const familiesAttributeGroupsCreateResponseData =
    kernLogicAPIClient.familiesAttributeGroupsCreate(id, familyRequest);

  /**
   *
   */
  id = 7300313469596953;

  const familiesAttributeGroupsRetrieveResponseData =
    kernLogicAPIClient.familiesAttributeGroupsRetrieve(id);

  /**
   *
   */
  id = "next";
  groupId = "showboat";

  const familiesAttributeGroupsDestroyResponseData =
    kernLogicAPIClient.familiesAttributeGroupsDestroy(id, groupId);

  /**
   *
   */

  const localesListResponseData = kernLogicAPIClient.localesList();

  /**
   *
   */
  localeRequest = {
    code: "joshingly",
    label: "monthly",
    is_active: true,
  };

  const localesCreateResponseData =
    kernLogicAPIClient.localesCreate(localeRequest);

  /**
   *
   */
  id = 4935385163783922;
  patchedLocaleRequest = {
    code: "wherever",
    label: "excluding",
    is_active: true,
  };

  const localesPartialUpdateResponseData =
    kernLogicAPIClient.localesPartialUpdate(id, patchedLocaleRequest);

  /**
   *
   */
  id = 5826950172739413;

  const localesRetrieveResponseData = kernLogicAPIClient.localesRetrieve(id);

  /**
   *
   */
  id = 7736200069771802;
  localeRequest = {
    code: "while",
    label: "between",
    is_active: true,
  };

  const localesUpdateResponseData = kernLogicAPIClient.localesUpdate(
    id,
    localeRequest,
  );

  /**
   *
   */
  id = 2410566996518677;

  const localesDestroyResponseData = kernLogicAPIClient.localesDestroy(id);

  /**
   *
   */

  const channelsListResponseData = kernLogicAPIClient.channelsList();

  /**
   *
   */
  salesChannelRequest = {
    code: "joshingly",
    name: "spiteful",
    description: "smoothly",
    is_active: false,
  };

  const channelsCreateResponseData =
    kernLogicAPIClient.channelsCreate(salesChannelRequest);

  /**
   *
   */
  id = 468714595743311;
  patchedSalesChannelRequest = {
    code: "hovel",
    name: "roughly",
    description: "christen",
    is_active: false,
  };

  const channelsPartialUpdateResponseData =
    kernLogicAPIClient.channelsPartialUpdate(id, patchedSalesChannelRequest);

  /**
   *
   */
  id = 4610443908303835;

  const channelsRetrieveResponseData = kernLogicAPIClient.channelsRetrieve(id);

  /**
   *
   */
  id = 6766860273738099;
  salesChannelRequest = {
    code: "synthesise",
    name: "before",
    description: "negotiation",
    is_active: false,
  };

  const channelsUpdateResponseData = kernLogicAPIClient.channelsUpdate(
    id,
    salesChannelRequest,
  );

  /**
   *
   */
  id = 7912787712927842;

  const channelsDestroyResponseData = kernLogicAPIClient.channelsDestroy(id);

  /**
   *
   */
  productPk = "along";

  const productsAssetsListResponseData =
    kernLogicAPIClient.productsAssetsList(productPk);

  /**
   *
   */
  productPk = 7181405279121838;
  productAssetRequest = {
    file: "pro",
    asset_type: "doubtfully",
    name: "plus",
    order: 1288547659091887,
    is_primary: true,
    content_type: "blah",
    file_size: 2440953471779955,
    uploaded_by: 8400249028941555,
    tags: [],
  };

  const productsAssetsCreateResponseData =
    kernLogicAPIClient.productsAssetsCreate(productPk, productAssetRequest);

  /**
   *
   */
  productPk = 1973477663170007;
  productAssetRequest = {
    file: "despite",
    asset_type: "liquid",
    name: "describe",
    order: 6615871474649820,
    is_primary: true,
    content_type: "save",
    file_size: 3249884362676587,
    uploaded_by: 1470130132441211,
    tags: [],
  };

  const productsAssetsBulkDownloadCreateResponseData =
    kernLogicAPIClient.productsAssetsBulkDownloadCreate(
      productPk,
      productAssetRequest,
    );

  /**
   *
   */
  productPk = 3555522867932056;
  productAssetRequest = {
    file: "velvety",
    asset_type: "boo",
    name: "bravely",
    order: 4695631880738061,
    is_primary: false,
    content_type: "separately",
    file_size: 7086771696808328,
    uploaded_by: 8127147107923164,
    tags: [],
  };

  const productsAssetsBulkUpdateCreateResponseData =
    kernLogicAPIClient.productsAssetsBulkUpdateCreate(
      productPk,
      productAssetRequest,
    );

  /**
   *
   */
  productPk = 5062308670247435;
  productAssetRequest = {
    file: "restfully",
    asset_type: "entry",
    name: "roadway",
    order: 7920715129446521,
    is_primary: false,
    content_type: "finally",
    file_size: 6170802949774774,
    uploaded_by: 5170538795435298,
    tags: [],
  };

  const productsAssetsReorderCreateResponseData =
    kernLogicAPIClient.productsAssetsReorderCreate(
      productPk,
      productAssetRequest,
    );

  /**
   *
   */
  productPk = 3380360035722114;
  id = 2034669306365077;
  patchedProductAssetRequest = {
    file: "broadside",
    asset_type: "ugh",
    name: "unexpectedly",
    order: 3314522268999069,
    is_primary: true,
    content_type: "within",
    file_size: 1071267633440524,
    uploaded_by: 5503919259318359,
    tags: [],
  };

  const productsAssetsPartialUpdateResponseData =
    kernLogicAPIClient.productsAssetsPartialUpdate(
      productPk,
      id,
      patchedProductAssetRequest,
    );

  /**
   *
   */
  productPk = 7162944393029744;
  id = 7652678240191013;

  const productsAssetsRetrieveResponseData =
    kernLogicAPIClient.productsAssetsRetrieve(productPk, id);

  /**
   *
   */
  productPk = 6870926189562148;
  id = 1059810500341412;
  productAssetRequest = {
    file: "authentic",
    asset_type: "huzzah",
    name: "unnecessarily",
    order: 6287278518610001,
    is_primary: true,
    content_type: "ruddy",
    file_size: 3451636759279629,
    uploaded_by: 4931183357173770,
    tags: [],
  };

  const productsAssetsUpdateResponseData =
    kernLogicAPIClient.productsAssetsUpdate(productPk, id, productAssetRequest);

  /**
   *
   */
  productPk = 2267623804127977;
  id = 19416490608872;

  const productsAssetsDestroyResponseData =
    kernLogicAPIClient.productsAssetsDestroy(productPk, id);

  /**
   *
   */
  productPk = 1567850413464047;
  id = 5547499053145415;

  const productsAssetsDownloadRetrieveResponseData =
    kernLogicAPIClient.productsAssetsDownloadRetrieve(productPk, id);

  /**
   *
   */
  productPk = 2985148612267568;
  id = 7663542472228848;

  const productsAssetsDownloadAssetRetrieveResponseData =
    kernLogicAPIClient.productsAssetsDownloadAssetRetrieve(productPk, id);

  /**
   *
   */
  productPk = 4589688813331883;
  id = 7406135781801303;
  productAssetRequest = {
    file: "optimistic",
    asset_type: "ski",
    name: "round",
    order: 6094921065776975,
    is_primary: false,
    content_type: "hypothesise",
    file_size: 7123631547866972,
    uploaded_by: 6827716554969619,
    tags: [],
  };

  const productsAssetsSetPrimaryCreateResponseData =
    kernLogicAPIClient.productsAssetsSetPrimaryCreate(
      productPk,
      id,
      productAssetRequest,
    );

  /**
   *
   */
  productPk = "championship";

  const productsAssetBundlesListResponseData =
    kernLogicAPIClient.productsAssetBundlesList(productPk);

  /**
   *
   */
  productPk = "deliquesce";
  assetBundleRequest = {
    name: "like",
    asset_ids: [],
  };

  const productsAssetBundlesCreateResponseData =
    kernLogicAPIClient.productsAssetBundlesCreate(
      productPk,
      assetBundleRequest,
    );

  /**
   *
   */
  productPk = "platter";
  id = "well-off";
  patchedAssetBundleRequest = {
    name: "contrail",
    asset_ids: [],
  };

  const productsAssetBundlesPartialUpdateResponseData =
    kernLogicAPIClient.productsAssetBundlesPartialUpdate(
      productPk,
      id,
      patchedAssetBundleRequest,
    );

  /**
   *
   */
  productPk = "shameless";
  id = "toward";

  const productsAssetBundlesRetrieveResponseData =
    kernLogicAPIClient.productsAssetBundlesRetrieve(productPk, id);

  /**
   *
   */
  productPk = "unto";
  id = "optimistically";
  assetBundleRequest = {
    name: "dirty",
    asset_ids: [],
  };

  const productsAssetBundlesUpdateResponseData =
    kernLogicAPIClient.productsAssetBundlesUpdate(
      productPk,
      id,
      assetBundleRequest,
    );

  /**
   *
   */
  productPk = "function";
  id = "yum";

  const productsAssetBundlesDestroyResponseData =
    kernLogicAPIClient.productsAssetBundlesDestroy(productPk, id);

  /**
   *
   */
  productPk = "ideal";
  id = "wasabi";

  const productsAssetBundlesDownloadRetrieveResponseData =
    kernLogicAPIClient.productsAssetBundlesDownloadRetrieve(productPk, id);

  /**
   * List all attribute values
   */
  productPk = "fatal";

  const productsAttributesListResponseData =
    kernLogicAPIClient.productsAttributesList(productPk);

  /**
   * Create a new attribute value
   */
  productPk = 8007388407091015;
  attributeValueRequest = {
    locale_code: "happily",
    channel: "fortunately",
    value: {},
    product: 205498970513159,
    attribute: 1221051840337623,
    locale: 4869319377068244,
  };

  const productsAttributesCreateResponseData =
    kernLogicAPIClient.productsAttributesCreate(
      productPk,
      attributeValueRequest,
    );

  /**
   *
   */
  productPk = 8456658296844238;
  attributeValueRequest = {
    locale_code: "beyond",
    channel: "weakly",
    value: {},
    product: 4165938389384652,
    attribute: 2691924718133069,
    locale: 5148602688090923,
  };

  const productsAttributesBulkCreateCreateResponseData =
    kernLogicAPIClient.productsAttributesBulkCreateCreate(
      productPk,
      attributeValueRequest,
    );

  /**
   * Partially update an attribute value
   */
  productPk = 8932226420412780;
  id = 4466899925086622;
  patchedAttributeValueRequest = {
    locale_code: "terribly",
    channel: "joyfully",
    value: {},
    product: 2473929543395233,
    attribute: 7072771573864353,
    locale: 3763303394231303,
  };

  const productsAttributesPartialUpdateResponseData =
    kernLogicAPIClient.productsAttributesPartialUpdate(
      productPk,
      id,
      patchedAttributeValueRequest,
    );

  /**
   * Get a specific attribute value
   */
  productPk = 2726484340167527;
  id = 6011206474425001;

  const productsAttributesRetrieveResponseData =
    kernLogicAPIClient.productsAttributesRetrieve(productPk, id);

  /**
   * Update an attribute value
   */
  productPk = 8021484691518800;
  id = 4364959358122024;
  attributeValueRequest = {
    locale_code: "treble",
    channel: "slowly",
    value: {},
    product: 1213536769896264,
    attribute: 7147129509836936,
    locale: 133181981714641,
  };

  const productsAttributesUpdateResponseData =
    kernLogicAPIClient.productsAttributesUpdate(
      productPk,
      id,
      attributeValueRequest,
    );

  /**
   * Delete an attribute value
   */
  productPk = 7215575594523465;
  id = 6545234561325208;

  const productsAttributesDestroyResponseData =
    kernLogicAPIClient.productsAttributesDestroy(productPk, id);

  /**
   * Get attribute groups with values for a product
   */
  productPk = "down";

  const productsAttributeGroupsListResponseData =
    kernLogicAPIClient.productsAttributeGroupsList(productPk);

  /**
   *
   */
  productPk = 7062362299478210;
  id = 6332980817748363;

  const productsAttributeGroupsRetrieveResponseData =
    kernLogicAPIClient.productsAttributeGroupsRetrieve(productPk, id);

  /**
   *
   */
  productPk = "reach";

  const productsActivitiesListResponseData =
    kernLogicAPIClient.productsActivitiesList(productPk);

  /**
   *
   */
  productPk = "consequently";

  const productsFamilyOverridesListResponseData =
    kernLogicAPIClient.productsFamilyOverridesList(productPk);

  /**
   *
   */
  productPk = 5633855894496412;
  productFamilyOverrideRequest = {
    attribute_group: 519301283002725,
    removed: false,
  };

  const productsFamilyOverridesCreateResponseData =
    kernLogicAPIClient.productsFamilyOverridesCreate(
      productPk,
      productFamilyOverrideRequest,
    );

  /**
   *
   */
  productPk = 258134681289884;
  id = 4316368821879215;

  const productsFamilyOverridesDestroyResponseData =
    kernLogicAPIClient.productsFamilyOverridesDestroy(productPk, id);

  /**
   *
   */

  const productsSkuCheckCreateResponseData =
    kernLogicAPIClient.productsSkuCheckCreate();

  /**
   *
   */
  productId = 4278643341822369;

  const productsPdfRetrieveResponseData =
    kernLogicAPIClient.productsPdfRetrieve(productId);

  /**
   *
   */
  productId = 2118525534217181;
  productsOverrideGroupCreateBody = {
    attribute_group: 1448797774829028,
    removed: false,
  };
  params = {
    product_id: 2375083853126865,
  };

  const productsOverrideGroupCreateResponseData =
    kernLogicAPIClient.productsOverrideGroupCreate(
      productId,
      productsOverrideGroupCreateBody,
      params,
    );

  /**
   *
   */

  const importsListResponseData = kernLogicAPIClient.importsList();

  /**
   *
   */
  importTaskRequest = {
    csv_file: "despite",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const importsCreateResponseData =
    kernLogicAPIClient.importsCreate(importTaskRequest);

  /**
   *
   */
  id = 8039726651915565;

  const importsRetrieveResponseData = kernLogicAPIClient.importsRetrieve(id);

  /**
   *
   */
  id = 2338354494653767;
  importTaskRequest = {
    csv_file: "afore",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const importsCancelCreateResponseData =
    kernLogicAPIClient.importsCancelCreate(id, importTaskRequest);

  /**
   *
   */
  id = 2979307447766464;

  const importsGetReportRetrieveResponseData =
    kernLogicAPIClient.importsGetReportRetrieve(id);

  /**
   *
   */
  id = 1972153461347454;

  const importsPreviewRetrieveResponseData =
    kernLogicAPIClient.importsPreviewRetrieve(id);

  /**
   *
   */

  const attributeGroupsImportListResponseData =
    kernLogicAPIClient.attributeGroupsImportList();

  /**
   *
   */
  importTaskRequest = {
    csv_file: "penalise",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const attributeGroupsImportCreateResponseData =
    kernLogicAPIClient.attributeGroupsImportCreate(importTaskRequest);

  /**
   *
   */
  id = 391428117985023;
  patchedImportTaskRequest = {
    csv_file: "duh",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const attributeGroupsImportPartialUpdateResponseData =
    kernLogicAPIClient.attributeGroupsImportPartialUpdate(
      id,
      patchedImportTaskRequest,
    );

  /**
   *
   */
  id = 2677909036022362;

  const attributeGroupsImportRetrieveResponseData =
    kernLogicAPIClient.attributeGroupsImportRetrieve(id);

  /**
   *
   */
  id = 2253909787962757;
  importTaskRequest = {
    csv_file: "atomize",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const attributeGroupsImportUpdateResponseData =
    kernLogicAPIClient.attributeGroupsImportUpdate(id, importTaskRequest);

  /**
   *
   */
  id = 7540921840142897;

  const attributeGroupsImportDestroyResponseData =
    kernLogicAPIClient.attributeGroupsImportDestroy(id);

  /**
   *
   */

  const attributesImportListResponseData =
    kernLogicAPIClient.attributesImportList();

  /**
   *
   */
  importTaskRequest = {
    csv_file: "pfft",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const attributesImportCreateResponseData =
    kernLogicAPIClient.attributesImportCreate(importTaskRequest);

  /**
   *
   */
  id = 290862985756226;
  patchedImportTaskRequest = {
    csv_file: "fireplace",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const attributesImportPartialUpdateResponseData =
    kernLogicAPIClient.attributesImportPartialUpdate(
      id,
      patchedImportTaskRequest,
    );

  /**
   *
   */
  id = 809043477850984;

  const attributesImportRetrieveResponseData =
    kernLogicAPIClient.attributesImportRetrieve(id);

  /**
   *
   */
  id = 1815643949602874;
  importTaskRequest = {
    csv_file: "thrifty",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const attributesImportUpdateResponseData =
    kernLogicAPIClient.attributesImportUpdate(id, importTaskRequest);

  /**
   *
   */
  id = 2280908990623818;

  const attributesImportDestroyResponseData =
    kernLogicAPIClient.attributesImportDestroy(id);

  /**
   *
   */

  const familiesImportListResponseData =
    kernLogicAPIClient.familiesImportList();

  /**
   *
   */
  importTaskRequest = {
    csv_file: "as",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const familiesImportCreateResponseData =
    kernLogicAPIClient.familiesImportCreate(importTaskRequest);

  /**
   *
   */
  id = 8772100590124345;
  patchedImportTaskRequest = {
    csv_file: "better",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const familiesImportPartialUpdateResponseData =
    kernLogicAPIClient.familiesImportPartialUpdate(
      id,
      patchedImportTaskRequest,
    );

  /**
   *
   */
  id = 4666196650129182;

  const familiesImportRetrieveResponseData =
    kernLogicAPIClient.familiesImportRetrieve(id);

  /**
   *
   */
  id = 3385547592776718;
  importTaskRequest = {
    csv_file: "ugh",
    mapping: {},
    duplicate_strategy: undefined,
  };

  const familiesImportUpdateResponseData =
    kernLogicAPIClient.familiesImportUpdate(id, importTaskRequest);

  /**
   *
   */
  id = 297434428875604;

  const familiesImportDestroyResponseData =
    kernLogicAPIClient.familiesImportDestroy(id);

  /**
   *
   */

  const fieldSchemaRetrieveResponseData =
    kernLogicAPIClient.fieldSchemaRetrieve();

  /**
   *
   */

  const attributeGroupsSchemaRetrieveResponseData =
    kernLogicAPIClient.attributeGroupsSchemaRetrieve();

  /**
   *
   */

  const attributesSchemaRetrieveResponseData =
    kernLogicAPIClient.attributesSchemaRetrieve();

  /**
   *
   */

  const familiesSchemaRetrieveResponseData =
    kernLogicAPIClient.familiesSchemaRetrieve();

  /**
   *
   */

  const reportsThemesListResponseData = kernLogicAPIClient.reportsThemesList();

  /**
   *
   */
  id = 5681159403658563;

  const reportsThemesRetrieveResponseData =
    kernLogicAPIClient.reportsThemesRetrieve(id);

  /**
   *
   */

  const analyticsCategoriesRetrieveResponseData =
    kernLogicAPIClient.analyticsCategoriesRetrieve();

  /**
   *
   */

  const analyticsChangeHistoryRetrieveResponseData =
    kernLogicAPIClient.analyticsChangeHistoryRetrieve();

  /**
   *
   */

  const analyticsChannelsRetrieveResponseData =
    kernLogicAPIClient.analyticsChannelsRetrieve();

  /**
   *
   */

  const analyticsCompletenessRetrieveResponseData =
    kernLogicAPIClient.analyticsCompletenessRetrieve();

  /**
   *
   */

  const analyticsEnrichmentVelocityRetrieveResponseData =
    kernLogicAPIClient.analyticsEnrichmentVelocityRetrieve();

  /**
   *
   */

  const analyticsLocalesRetrieveResponseData =
    kernLogicAPIClient.analyticsLocalesRetrieve();

  /**
   *
   */

  const analyticsLocalizationQualityRetrieveResponseData =
    kernLogicAPIClient.analyticsLocalizationQualityRetrieve();

  /**
   *
   */

  const analyticsReadinessRetrieveResponseData =
    kernLogicAPIClient.analyticsReadinessRetrieve();

  /**
   *
   */

  const completenessExportRetrieveResponseData =
    kernLogicAPIClient.completenessExportRetrieve();

  /**
   *
   */

  const readinessExportRetrieveResponseData =
    kernLogicAPIClient.readinessExportRetrieve();

  /**
   *
   */

  const enrichmentVelocityExportRetrieveResponseData =
    kernLogicAPIClient.enrichmentVelocityExportRetrieve();

  /**
   *
   */

  const localizationQualityExportRetrieveResponseData =
    kernLogicAPIClient.localizationQualityExportRetrieve();

  /**
   *
   */

  const changeHistoryExportRetrieveResponseData =
    kernLogicAPIClient.changeHistoryExportRetrieve();

  /**
   *
   */

  const localizationQualityRetrieveResponseData =
    kernLogicAPIClient.localizationQualityRetrieve();

  /**
   *
   */
  orgId = "under";

  const orgsRolesListResponseData = kernLogicAPIClient.orgsRolesList(orgId);

  /**
   *
   */
  orgId = 5812122514879834;
  roleRequest = {
    name: "sarong",
    description: "finally",
    permissions: {},
  };

  const orgsRolesCreateResponseData = kernLogicAPIClient.orgsRolesCreate(
    orgId,
    roleRequest,
  );

  /**
   *
   */
  orgId = 6954915172282945;
  id = 6674620841153101;
  patchedRoleRequest = {
    name: "barring",
    description: "jubilantly",
    permissions: {},
  };

  const orgsRolesPartialUpdateResponseData =
    kernLogicAPIClient.orgsRolesPartialUpdate(orgId, id, patchedRoleRequest);

  /**
   *
   */
  orgId = 87699612729358;
  id = 7952190499581569;

  const orgsRolesRetrieveResponseData = kernLogicAPIClient.orgsRolesRetrieve(
    orgId,
    id,
  );

  /**
   *
   */
  orgId = 5266233822087711;
  id = 3955509284102823;
  roleRequest = {
    name: "equally",
    description: "down",
    permissions: {},
  };

  const orgsRolesUpdateResponseData = kernLogicAPIClient.orgsRolesUpdate(
    orgId,
    id,
    roleRequest,
  );

  /**
   *
   */
  orgId = 8503271349166922;
  id = 1131467193947695;

  const orgsRolesDestroyResponseData = kernLogicAPIClient.orgsRolesDestroy(
    orgId,
    id,
  );

  /**
   *
   */
  orgId = "dwell";

  const orgsMembershipsListResponseData =
    kernLogicAPIClient.orgsMembershipsList(orgId);

  /**
   *
   */
  orgId = 4158488170073604;
  membershipRequest = {
    role_id: 502103582208076,
    status: "pending",
    organization: 5846585652876225,
  };

  const orgsMembershipsCreateResponseData =
    kernLogicAPIClient.orgsMembershipsCreate(orgId, membershipRequest);

  /**
   *
   */
  orgId = 6168225530891348;

  const orgsMembershipsInvitesRetrieveResponseData =
    kernLogicAPIClient.orgsMembershipsInvitesRetrieve(orgId);

  /**
   *
   */
  orgId = 5568447982850929;
  id = 70055805585608;
  patchedMembershipRequest = {
    role_id: 3214069139063820,
    status: "pending",
    organization: 7029529392141431,
  };

  const orgsMembershipsPartialUpdateResponseData =
    kernLogicAPIClient.orgsMembershipsPartialUpdate(
      orgId,
      id,
      patchedMembershipRequest,
    );

  /**
   *
   */
  orgId = 5623475198770491;
  id = 5046355128958760;

  const orgsMembershipsRetrieveResponseData =
    kernLogicAPIClient.orgsMembershipsRetrieve(orgId, id);

  /**
   *
   */
  orgId = 4891697699256162;
  id = 2924157067089339;
  membershipRequest = {
    role_id: 7603375343758299,
    status: "pending",
    organization: 3020487865813274,
  };

  const orgsMembershipsUpdateResponseData =
    kernLogicAPIClient.orgsMembershipsUpdate(orgId, id, membershipRequest);

  /**
   *
   */
  orgId = 6402052474412191;
  id = 7049324246443388;

  const orgsMembershipsDestroyResponseData =
    kernLogicAPIClient.orgsMembershipsDestroy(orgId, id);

  /**
   *
   */
  orgId = 4557044813237976;
  id = 3807241573606855;
  membershipRequest = {
    role_id: 2852251042475726,
    status: "pending",
    organization: 2258194240384958,
  };

  const orgsMembershipsAcceptCreateResponseData =
    kernLogicAPIClient.orgsMembershipsAcceptCreate(
      orgId,
      id,
      membershipRequest,
    );

  /**
   *
   */
  orgId = 8900916343860370;
  id = 2018265953765436;

  const orgsMembershipsCheckInvitationRetrieveResponseData =
    kernLogicAPIClient.orgsMembershipsCheckInvitationRetrieve(orgId, id);

  /**
   *
   */
  orgId = 1889616876947173;
  id = 6193952619675778;
  membershipRequest = {
    role_id: 4760966551327003,
    status: "pending",
    organization: 8552138034808376,
  };

  const orgsMembershipsResendInviteCreateResponseData =
    kernLogicAPIClient.orgsMembershipsResendInviteCreate(
      orgId,
      id,
      membershipRequest,
    );

  /**
   *
   */
  orgId = "search";

  const orgsAuditListResponseData = kernLogicAPIClient.orgsAuditList(orgId);

  /**
   *
   */
  orgId = 6299312613240376;
  id = 8218768364305139;

  const orgsAuditRetrieveResponseData = kernLogicAPIClient.orgsAuditRetrieve(
    orgId,
    id,
  );

  /**
   *
   */
  id = 6535499901495152;

  const orgsMembershipsCheckRetrieveResponseData =
    kernLogicAPIClient.orgsMembershipsCheckRetrieve(id);

  /**
   *
   */

  const currenciesListResponseData = kernLogicAPIClient.currenciesList();

  /**
   *
   */
  currencyRequest = {
    symbol: "or",
    name: "quicker",
    decimals: 176724840658835,
  };

  const currenciesCreateResponseData =
    kernLogicAPIClient.currenciesCreate(currencyRequest);

  /**
   *
   */
  isoCode = "convince";
  patchedCurrencyRequest = {
    symbol: "boo",
    name: "petty",
    decimals: 8720102832135172,
  };

  const currenciesPartialUpdateResponseData =
    kernLogicAPIClient.currenciesPartialUpdate(isoCode, patchedCurrencyRequest);

  /**
   *
   */
  isoCode = "until";

  const currenciesRetrieveResponseData =
    kernLogicAPIClient.currenciesRetrieve(isoCode);

  /**
   *
   */
  isoCode = "midst";
  currencyRequest = {
    symbol: "suburban",
    name: "tapioca",
    decimals: 1468025863783361,
  };

  const currenciesUpdateResponseData = kernLogicAPIClient.currenciesUpdate(
    isoCode,
    currencyRequest,
  );

  /**
   *
   */
  isoCode = "heartache";

  const currenciesDestroyResponseData =
    kernLogicAPIClient.currenciesDestroy(isoCode);

  /**
   *
   */

  const priceTypesListResponseData = kernLogicAPIClient.priceTypesList();

  /**
   *
   */
  priceTypeRequest = {
    code: "embalm",
    label: "oh",
  };

  const priceTypesCreateResponseData =
    kernLogicAPIClient.priceTypesCreate(priceTypeRequest);

  /**
   *
   */
  id = 2645828810677687;
  patchedPriceTypeRequest = {
    code: "exempt",
    label: "testify",
  };

  const priceTypesPartialUpdateResponseData =
    kernLogicAPIClient.priceTypesPartialUpdate(id, patchedPriceTypeRequest);

  /**
   *
   */
  id = 6227892823947959;

  const priceTypesRetrieveResponseData =
    kernLogicAPIClient.priceTypesRetrieve(id);

  /**
   *
   */
  id = 83328071261723;
  priceTypeRequest = {
    code: "wealthy",
    label: "more",
  };

  const priceTypesUpdateResponseData = kernLogicAPIClient.priceTypesUpdate(
    id,
    priceTypeRequest,
  );

  /**
   *
   */
  id = 2127525278104656;

  const priceTypesDestroyResponseData =
    kernLogicAPIClient.priceTypesDestroy(id);

  /**
   *
   */

  const registerCreateResponseData = kernLogicAPIClient.registerCreate();

  /**
   *
   */

  const loginCreateResponseData = kernLogicAPIClient.loginCreate();

  /**
   *
   */

  const logoutCreateResponseData = kernLogicAPIClient.logoutCreate();

  /**
   *
   */

  const setPasswordCreateResponseData = kernLogicAPIClient.setPasswordCreate();

  /**
   *
   */

  const checkUserCreateResponseData = kernLogicAPIClient.checkUserCreate();

  /**
   *
   */

  const userRetrieveResponseData = kernLogicAPIClient.userRetrieve();

  /**
   *
   */

  const usersListResponseData = kernLogicAPIClient.usersList();

  /**
   *
   */

  const usersMeRetrieveResponseData = kernLogicAPIClient.usersMeRetrieve();

  /**
   *
   */

  const testDbRetrieveResponseData = kernLogicAPIClient.testDbRetrieve();
}
