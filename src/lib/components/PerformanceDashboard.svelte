<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { performanceSuite } from '../utils/performance.js';
  import { Badge, Card, Button } from 'flowbite-svelte';
  import { Activity, Cpu, Database, Zap } from 'lucide-svelte';

  // Props
  interface Props {
    visible?: boolean;
    onClose?: () => void;
  }

  interface MeasurementStats {
    count: number;
    avg: number;
    min: number;
    max: number;
    total: number;
  }

  let { visible = false, onClose = () => {} }: Props = $props();

  // Performance data
  let performanceData: any = $state({
    memory: {},
    rendering: {},
    interactions: {},
    measurements: {},
    isMonitoring: false
  });

  let updateInterval: number | null = null;

  // Update performance data
  const updatePerformanceData = () => {
    if (visible) {
      performanceData = performanceSuite.getPerformanceReport();
    }
  };

  // Start monitoring
  const startMonitoring = () => {
    if (!performanceSuite.isRunning) {
      performanceSuite.startMonitoring();
    }
    updateInterval = setInterval(updatePerformanceData, 1000);
  };

  // Stop monitoring
  const stopMonitoring = () => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  };

  // Clear performance data
  const clearData = () => {
    performanceSuite.performanceMonitor.clearMeasurements();
    updatePerformanceData();
  };

  // Format memory size
  const formatMemory = (mb: number) => {
    if (!mb) return 'N/A';
    return `${mb.toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms === undefined || ms === null) return 'N/A';
    return `${ms.toFixed(1)} ms`;
  };

  // Get performance status color
  const getPerformanceStatus = (value: number, thresholds: { good: number; fair: number }) => {
    if (value <= thresholds.good) return 'green';
    if (value <= thresholds.fair) return 'yellow';
    return 'red';
  };

  // Convert measurements to typed array
  const typedMeasurements = $derived(() => {
    return Object.entries(performanceData.measurements || {}).map(([name, stats]) => ({
      name,
      stats: stats as MeasurementStats
    }));
  });

  onMount(() => {
    if (visible) {
      startMonitoring();
      updatePerformanceData();
    }
  });

  onDestroy(() => {
    stopMonitoring();
  });

  // Watch visibility changes
  $effect(() => {
    if (visible) {
      startMonitoring();
      updatePerformanceData();
    } else {
      stopMonitoring();
    }
  });
</script>

{#if visible}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <div class="flex items-center gap-3">
          <Activity class="w-6 h-6 text-blue-600" />
          <h2 class="text-xl font-semibold text-gray-900">Performance Dashboard</h2>
          <Badge color={performanceData.isMonitoring ? 'green' : 'red'}>
            {performanceData.isMonitoring ? 'Monitoring' : 'Stopped'}
          </Badge>
        </div>
        <div class="flex items-center gap-2">
          <Button size="sm" color="light" onclick={clearData}>
            Clear Data
          </Button>
          <Button size="sm" color="light" onclick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="p-6 space-y-6">
        
        <!-- Memory Usage -->
        <Card class="p-4">
          <div class="flex items-center gap-3 mb-4">
            <Database class="w-5 h-5 text-blue-600" />
            <h3 class="text-lg font-medium text-gray-900">Memory Usage</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {formatMemory(performanceData.memory?.used)}
              </div>
              <div class="text-sm text-gray-500">Used Memory</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {formatMemory(performanceData.memory?.total)}
              </div>
              <div class="text-sm text-gray-500">Total Allocated</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {formatMemory(performanceData.memory?.limit)}
              </div>
              <div class="text-sm text-gray-500">Memory Limit</div>
            </div>
          </div>
        </Card>

        <!-- Rendering Performance -->
        <Card class="p-4">
          <div class="flex items-center gap-3 mb-4">
            <Zap class="w-5 h-5 text-green-600" />
            <h3 class="text-lg font-medium text-gray-900">Rendering Performance</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {performanceData.rendering?.fps || 'N/A'}
              </div>
              <div class="text-sm text-gray-500">FPS</div>
              {#if performanceData.rendering?.fps}
                <Badge color={getPerformanceStatus(60 - performanceData.rendering?.fps, { good: 5, fair: 15 })}>
                  {performanceData.rendering?.fps >= 55 ? 'Excellent' : performanceData.rendering?.fps >= 45 ? 'Good' : 'Poor'}
                </Badge>
              {/if}
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {formatDuration(performanceData.rendering?.avgFrameTime)}
              </div>
              <div class="text-sm text-gray-500">Avg Frame Time</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {performanceData.rendering?.frameCount || 0}
              </div>
              <div class="text-sm text-gray-500">Frame Count</div>
            </div>
          </div>
        </Card>

        <!-- User Interactions -->
        <Card class="p-4">
          <div class="flex items-center gap-3 mb-4">
            <Cpu class="w-5 h-5 text-purple-600" />
            <h3 class="text-lg font-medium text-gray-900">User Interactions</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {performanceData.interactions?.totalInteractions || 0}
              </div>
              <div class="text-sm text-gray-500">Total Interactions</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-900">
                {formatDuration(performanceData.interactions?.avgTimeBetween)}
              </div>
              <div class="text-sm text-gray-500">Avg Time Between</div>
            </div>
          </div>
          {#if performanceData.interactions?.interactionTypes}
            <div class="mt-4">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Interaction Types</h4>
              <div class="flex flex-wrap gap-2">
                {#each Object.entries(performanceData.interactions?.interactionTypes || {}) as [type, count]}
                  <Badge color="blue">{type}: {count}</Badge>
                {/each}
              </div>
            </div>
          {/if}
        </Card>

        <!-- Performance Measurements -->
        <Card class="p-4">
          <div class="flex items-center gap-3 mb-4">
            <Activity class="w-5 h-5 text-orange-600" />
            <h3 class="text-lg font-medium text-gray-900">Performance Measurements</h3>
          </div>
          {#if typedMeasurements().length > 0}
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th class="px-4 py-2">Measurement</th>
                    <th class="px-4 py-2">Count</th>
                    <th class="px-4 py-2">Average</th>
                    <th class="px-4 py-2">Min</th>
                    <th class="px-4 py-2">Max</th>
                    <th class="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each typedMeasurements() as { name, stats }}
                    <tr class="bg-white border-b">
                      <td class="px-4 py-2 font-medium text-gray-900">{name}</td>
                      <td class="px-4 py-2">{stats.count}</td>
                      <td class="px-4 py-2">{formatDuration(stats.avg)}</td>
                      <td class="px-4 py-2">{formatDuration(stats.min)}</td>
                      <td class="px-4 py-2">{formatDuration(stats.max)}</td>
                      <td class="px-4 py-2">
                        <Badge color={getPerformanceStatus(stats.avg, { good: 100, fair: 500 })}>
                          {stats.avg <= 100 ? 'Fast' : stats.avg <= 500 ? 'Normal' : 'Slow'}
                        </Badge>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="text-center py-8 text-gray-500">
              No performance measurements available
            </div>
          {/if}
        </Card>

        <!-- Performance Tips -->
        <Card class="p-4 bg-blue-50">
          <h3 class="text-lg font-medium text-blue-900 mb-3">Performance Tips</h3>
          <div class="space-y-2 text-sm text-blue-800">
            <div class="flex items-start gap-2">
              <span class="font-medium">•</span>
              <span>Virtual scrolling is automatically enabled for lists with 50+ items</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="font-medium">•</span>
              <span>Images are lazy-loaded to improve initial page load times</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="font-medium">•</span>
              <span>Email operations are batched and debounced for better performance</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="font-medium">•</span>
              <span>Memory usage is monitored and optimized automatically</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure the dashboard has proper z-index and styling */
  .fixed {
    backdrop-filter: blur(4px);
  }
</style>