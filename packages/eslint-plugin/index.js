import honoHandlerResponseReturnType from '../../standards/typescript/hono/hono-handler-response-return-type/rule.js'
import honoNoStatusCodeCast from '../../standards/typescript/hono/hono-no-status-code-cast/rule.js'
import nextFetchWithoutCacheOptions from '../../standards/typescript/next/next-fetch-without-cache-options/rule.js'
import noBannerComments from '../../standards/typescript/base/no-banner-comments/rule.js'
import noCrossModuleDeepImport from '../../standards/typescript/base/no-cross-module-deep-import/rule.js'
import noHandlerResponseType from '../../standards/typescript/base/no-handler-response-type/rule.js'
import noInternalComments from '../../standards/typescript/base/no-internal-comments/rule.js'
import noNull from '../../standards/typescript/base/no-null/rule.js'
import noResultType from '../../standards/typescript/base/no-result-type/rule.js'
import noSinglePropertyParams from '../../standards/typescript/base/no-single-property-params/rule.js'
import noToResponseHelper from '../../standards/typescript/base/no-to-response-helper/rule.js'
import playwrightScreenshotAnimationsNotDisabled from '../../standards/typescript/testing/playwright-screenshot-animations-not-disabled/rule.js'
import prismaEnumValueCamelcaseImport from '../../standards/typescript/prisma/prisma-enum-value-camelcase-import/rule.js'
import radixAschildNonSemanticChild from '../../standards/typescript/react/radix-aschild-non-semantic-child/rule.js'
import radixIconTriggerWithoutAriaLabel from '../../standards/typescript/react/radix-icon-trigger-without-aria-label/rule.js'
import reactMultiUseOptimistic from '../../standards/typescript/react/react-multi-use-optimistic/rule.js'
import rhfFieldarrayKeyedByIndex from '../../standards/typescript/react-hook-form/rhf-fieldarray-keyed-by-index/rule.js'
import rhfNumberInputWithoutValueasnumber from '../../standards/typescript/react-hook-form/rhf-number-input-without-valueasnumber/rule.js'
import rhfSetErrorWithoutType from '../../standards/typescript/react-hook-form/rhf-set-error-without-type/rule.js'
import rhfWatchAtFormRoot from '../../standards/typescript/react-hook-form/rhf-watch-at-form-root/rule.js'
import tailwindArbitraryHexValue from '../../standards/typescript/tailwind/tailwind-arbitrary-hex-value/rule.js'
import tailwindDynamicClassName from '../../standards/typescript/tailwind/tailwind-dynamic-class-name/rule.js'
import tanstackQueryDataIntoState from '../../standards/typescript/react-query/tanstack-query-data-into-state/rule.js'
import tanstackQueryMissingEnabled from '../../standards/typescript/react-query/tanstack-query-missing-enabled/rule.js'
import tanstackQueryMutationWithoutInvalidation from '../../standards/typescript/react-query/tanstack-query-mutation-without-invalidation/rule.js'
import tanstackQueryOptimisticWithoutRollback from '../../standards/typescript/react-query/tanstack-query-optimistic-without-rollback/rule.js'
import tanstackQueryPrefetchWithoutStaletime from '../../standards/typescript/react-query/tanstack-query-prefetch-without-staletime/rule.js'
import tanstackTableColumnsInComponent from '../../standards/typescript/react-query/tanstack-table-columns-in-component/rule.js'
import undiciFetchWithoutAbortSignal from '../../standards/typescript/next/undici-fetch-without-abort-signal/rule.js'
import vitestAsyncErrorWithoutAssertions from '../../standards/typescript/testing/vitest-async-error-without-assertions/rule.js'
import vitestRestoreMocksConfig from '../../standards/typescript/testing/vitest-restore-mocks-config/rule.js'
import zodSchemaInComponent from '../../standards/typescript/zod/zod-schema-in-component/rule.js'
import zodTemporalNamedString from '../../standards/typescript/zod/zod-temporal-named-string/rule.js'

const plugin = {
  meta: { name: 'standards' },
  rules: {
    'hono-handler-response-return-type': honoHandlerResponseReturnType,
    'hono-no-status-code-cast': honoNoStatusCodeCast,
    'next-fetch-without-cache-options': nextFetchWithoutCacheOptions,
    'no-banner-comments': noBannerComments,
    'no-cross-module-deep-import': noCrossModuleDeepImport,
    'no-handler-response-type': noHandlerResponseType,
    'no-internal-comments': noInternalComments,
    'no-null': noNull,
    'no-result-type': noResultType,
    'no-single-property-params': noSinglePropertyParams,
    'no-to-response-helper': noToResponseHelper,
    'playwright-screenshot-animations-not-disabled': playwrightScreenshotAnimationsNotDisabled,
    'prisma-enum-value-camelcase-import': prismaEnumValueCamelcaseImport,
    'radix-aschild-non-semantic-child': radixAschildNonSemanticChild,
    'radix-icon-trigger-without-aria-label': radixIconTriggerWithoutAriaLabel,
    'react-multi-use-optimistic': reactMultiUseOptimistic,
    'rhf-fieldarray-keyed-by-index': rhfFieldarrayKeyedByIndex,
    'rhf-number-input-without-valueasnumber': rhfNumberInputWithoutValueasnumber,
    'rhf-set-error-without-type': rhfSetErrorWithoutType,
    'rhf-watch-at-form-root': rhfWatchAtFormRoot,
    'tailwind-arbitrary-hex-value': tailwindArbitraryHexValue,
    'tailwind-dynamic-class-name': tailwindDynamicClassName,
    'tanstack-query-data-into-state': tanstackQueryDataIntoState,
    'tanstack-query-missing-enabled': tanstackQueryMissingEnabled,
    'tanstack-query-mutation-without-invalidation': tanstackQueryMutationWithoutInvalidation,
    'tanstack-query-optimistic-without-rollback': tanstackQueryOptimisticWithoutRollback,
    'tanstack-query-prefetch-without-staletime': tanstackQueryPrefetchWithoutStaletime,
    'tanstack-table-columns-in-component': tanstackTableColumnsInComponent,
    'undici-fetch-without-abort-signal': undiciFetchWithoutAbortSignal,
    'vitest-async-error-without-assertions': vitestAsyncErrorWithoutAssertions,
    'vitest-restore-mocks-config': vitestRestoreMocksConfig,
    'zod-schema-in-component': zodSchemaInComponent,
    'zod-temporal-named-string': zodTemporalNamedString,
  },
}

export default plugin
