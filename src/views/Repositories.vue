<script setup>
import { useLayout } from '@/layout/composables/layout';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const repositories = ref([]);
const gitTokens = ref([]);
const selectedTokenId = ref([]);
const searchQuery = ref('');
const { getPrimary, getSurface, isDarkTheme } = useLayout();
const apiUrl = import.meta.env.VITE_API_URL;

const displayConfirmation = ref(false);
const displayStatsDialog = ref(false);
const selectedRepositoryId = ref(null);
const repositoryStats = ref(null);
const combinedChartData = ref();
const combinedChartOptions = ref();
const contributionChartData = ref();
const contributionChartOptions = ref();
const leadTimeChartData = ref();
const leadTimeChartOptions = ref();
const contributionPieChartData = ref();
const contributionPieChartOptions = ref();
const weeklyStatsChartData = ref();
const weeklyStatsChartOptions = ref();

// New references for the lines of code and file count charts
const linesOfCodeChartData = ref();
const linesOfCodeChartOptions = ref();
const fileCountChartData = ref();
const fileCountChartOptions = ref();

// Add scoreChartData and scoreChartOptions
const scoreChartData = ref();
const scoreChartOptions = ref();

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const router = useRouter();
const route = useRoute();
const toast = useToast();
const dt = ref(null); // Reference for the DataTable

const fetchRepositories = async (tokenId = null) => {
    try {
        const fetchUrl = tokenId ? `${apiUrl}/git/repositories/list?git_token_id=${tokenId}` : `${apiUrl}/git/repositories/list`;

        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch repositories');

        const data = await response.json();
        if (data.success) {
            repositories.value = data.data.repositories;
            gitTokens.value = data.data.git_tokens;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to retrieve repositories.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const filteredRepositories = computed(() => {
    if (!searchQuery.value) return repositories.value;

    const lowerCaseQuery = searchQuery.value.toLowerCase();
    return repositories.value.filter(
        (repo) =>
            repo.name.toLowerCase().includes(lowerCaseQuery) ||
            repo.owner.toLowerCase().includes(lowerCaseQuery) ||
            repo.url.toLowerCase().includes(lowerCaseQuery) ||
            repo.created_at.toLowerCase().includes(lowerCaseQuery) ||
            repo.last_fetched_at.toLowerCase().includes(lowerCaseQuery)
    );
});

const onTokenSelect = () => {
    if (selectedTokenId.value) {
        router.push(`/repositories?git_token_id=${selectedTokenId.value.id}`);
    }
    fetchRepositories(selectedTokenId.value.id);
};

const deleteRepository = async (id) => {
    try {
        const response = await fetch(`${apiUrl}/git/repositories/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to delete repository');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Repository deleted successfully!', life: 3000 });
            fetchRepositories(route.query.git_token_id);
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to delete repository.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const handleToggleChange = (id, currentStatus) => {
    const newStatus = !currentStatus;
    toggleRepositoryStatus(id, newStatus);
};

const toggleRepositoryStatus = async (id, newStatus) => {
    try {
        const response = await fetch(`${apiUrl}/git/repositories/${id}/toggle`, {
            method: 'POST',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_active: !newStatus
            })
        });

        if (!response.ok) throw new Error('Failed to update repository status');

        const data = await response.json();
        if (data.success) {
            toast.add({ severity: 'success', summary: 'Successful', detail: 'Repository status updated successfully!', life: 3000 });
            fetchRepositories(route.query.git_token_id);
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to update repository status.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const openConfirmation = (id) => {
    selectedRepositoryId.value = id;
    displayConfirmation.value = true;
};

const closeConfirmation = () => {
    displayConfirmation.value = false;
    selectedRepositoryId.value = null;
};

const confirmDeletion = () => {
    if (selectedRepositoryId.value !== null) {
        deleteRepository(selectedRepositoryId.value);
    }
    closeConfirmation();
};

const fetchRepositoryStats = async (id) => {
    try {
        const response = await fetch(`${apiUrl}/git/repositories/${id}/stats`, {
            method: 'GET',
            headers: {
                Authorization: localStorage.getItem('apiKey') || sessionStorage.getItem('apiKey'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch repository stats');

        const data = await response.json();
        if (data.success) {
            repositoryStats.value = data.data;
            prepareChartData();
            displayStatsDialog.value = true;
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: data.message || 'Failed to fetch repository stats.', life: 3000 });
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
    }
};

const prepareChartData = () => {
    const documentStyle = getComputedStyle(document.documentElement);

    // Define the available colors
    const availableColors = ['--p-indigo-500', '--p-purple-500', '--p-teal-500', '--p-orange-500', '--p-cyan-500'];

    // Prepare data for lines of code chart
    const fileTypes = Object.keys(repositoryStats.value.extension_stats);

    const contributors = [...new Set(fileTypes.flatMap((fileType) => Object.keys(repositoryStats.value.extension_stats[fileType])))];

    const linesOfCodeDatasets = contributors.map((contributor, index) => {
        return {
            label: contributor,
            backgroundColor: documentStyle.getPropertyValue(availableColors[index % availableColors.length]),
            data: fileTypes.map((fileType) => repositoryStats.value.extension_stats[fileType][contributor]?.lines || 0)
        };
    });

    linesOfCodeChartData.value = {
        labels: fileTypes,
        datasets: linesOfCodeDatasets
    };

    linesOfCodeChartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                stacked: true,
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            }
        }
    };

    // Prepare data for file count chart
    const fileCountDatasets = contributors.map((contributor, index) => {
        return {
            label: contributor,
            backgroundColor: documentStyle.getPropertyValue(availableColors[index % availableColors.length]),
            data: fileTypes.map((fileType) => repositoryStats.value.extension_stats[fileType][contributor]?.files || 0)
        };
    });

    fileCountChartData.value = {
        labels: fileTypes,
        datasets: fileCountDatasets
    };

    fileCountChartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                stacked: true,
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            }
        }
    };

    // Prepare the rest of the charts (combinedChartData, contributionChartData, etc.)

    const labels = repositoryStats.value.churn_rates.map((_, index) => `Commit ${index + 1}`);
    const churnRates = repositoryStats.value.churn_rates.map((stat) => stat.churn_rate);
    const additions = repositoryStats.value.churn_rates.map((stat) => stat.additions);
    const deletions = repositoryStats.value.churn_rates.map((stat) => stat.deletions);
    const scores = repositoryStats.value.churn_rates.map((stat) => parseInt(stat.score, 10));

    scoreChartData.value = {
        labels: labels, // Reusing the labels from the commits (Commit 1, Commit 2, etc.)
        datasets: [
            {
                label: 'Score',
                data: scores,
                borderColor: documentStyle.getPropertyValue('--p-orange-500'),
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            }
        ]
    };

    scoreChartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                },
                title: {
                    display: true,
                    text: 'Score',
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        }
    };

    combinedChartData.value = {
        labels: labels,
        datasets: [
            {
                label: 'Additions',
                type: 'bar',
                backgroundColor: documentStyle.getPropertyValue('--p-gray-500'),
                data: additions
            },
            {
                label: 'Deletions',
                type: 'bar',
                backgroundColor: documentStyle.getPropertyValue('--p-orange-500'),
                data: deletions
            }
        ]
    };

    combinedChartOptions.value = {
        stacked: false,
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                },
                title: {
                    display: true,
                    text: 'Additions/Deletions',
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        }
    };

    // Prepare contribution chart data
    const contributorsForChurn = Object.keys(repositoryStats.value.contribution);
    const additionValues = contributorsForChurn.map((contributor) => repositoryStats.value.contribution[contributor].additions);
    const deletionValues = contributorsForChurn.map((contributor) => repositoryStats.value.contribution[contributor].deletions);

    contributionChartData.value = {
        labels: contributorsForChurn,
        datasets: [
            {
                label: 'Additions',
                backgroundColor: documentStyle.getPropertyValue('--p-green-500'),
                data: additionValues
            },
            {
                label: 'Deletions',
                backgroundColor: documentStyle.getPropertyValue('--p-red-500'),
                data: deletionValues
            }
        ]
    };

    contributionChartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                stacked: true,
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            }
        }
    };

    contributionPieChartOptions.value = {
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        maintainAspectRatio: false,
        aspectRatio: 1.2
    };

    // Prepare contribution pie chart data
    const totalChanges = contributorsForChurn.map((contributor) => repositoryStats.value.contribution[contributor].total);
    contributionPieChartData.value = {
        labels: contributorsForChurn,
        datasets: [
            {
                label: 'Total Changes',
                backgroundColor: [documentStyle.getPropertyValue('--p-green-500'), documentStyle.getPropertyValue('--p-blue-500'), documentStyle.getPropertyValue('--p-orange-500')],
                data: totalChanges
            }
        ]
    };

    const leadTimes = repositoryStats.value.churn_rates.map((stat) => parseInt(stat.lead_time, 10));

    // Prepare Lead Time Metrics Chart
    leadTimeChartData.value = {
        labels: labels, // Reusing the labels from the commits (Commit 1, Commit 2, etc.)
        datasets: [
            {
                label: 'Lead Time (days)',
                data: leadTimes,
                borderColor: documentStyle.getPropertyValue('--p-blue-500'),
                backgroundColor: 'rgba(33, 150, 243, 0.2)',
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: 'Churn Rate (%)',
                type: 'line',
                tension: 0.4,
                borderColor: documentStyle.getPropertyValue('--p-cyan-500'),
                backgroundColor: 'rgba(66, 165, 245, 0.2)',
                fill: false,
                data: churnRates,
                yAxisID: 'y1'
            }
        ]
    };

    leadTimeChartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                },
                title: {
                    display: true,
                    text: 'Lead Time (days)',
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true,
                    max: 100 // Churn rate max at 100%
                },
                grid: {
                    drawOnChartArea: false,
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                },
                title: {
                    display: true,
                    text: 'Churn Rate (%)',
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        }
    };

    // Prepare Weekly Contribution Stats Chart Data

    // Trim empty arrays from weekly_stats and get the starting index
    const { trimmedStats, startIndex } = trimWeeklyStats(repositoryStats.value.weekly_stats);

    // Prepare Weekly Contribution Stats Chart Data
    const weeklyLabels = Array.from({ length: trimmedStats.length }, (_, i) => `Week ${startIndex + i + 1}`);

    const weeklyDataSets = contributorsForChurn.map((contributor) => {
        const data = trimmedStats.map((week) => week[contributor] || 0);
        return {
            label: contributor,
            data: data,
            fill: false,
            borderColor: getContributorColor(contributor, documentStyle), // function to assign color based on contributor
            tension: 0.4
        };
    });

    weeklyStatsChartData.value = {
        labels: weeklyLabels,
        datasets: weeklyDataSets
    };

    weeklyStatsChartOptions.value = {
        maintainAspectRatio: false,
        aspectRatio: 0.6,
        plugins: {
            legend: {
                labels: {
                    color: documentStyle.getPropertyValue('--p-text-color')
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color')
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            },
            y: {
                ticks: {
                    color: documentStyle.getPropertyValue('--p-text-muted-color'),
                    beginAtZero: true
                },
                grid: {
                    color: documentStyle.getPropertyValue('--p-content-border-color')
                }
            }
        }
    };
};

const getContributorColor = (contributor, documentStyle) => {
    const contributors = Object.keys(repositoryStats.value.contribution);
    // Function to assign a color to each contributor for the chart
    const colors = [
        documentStyle.getPropertyValue('--p-green-500'),
        documentStyle.getPropertyValue('--p-blue-500'),
        documentStyle.getPropertyValue('--p-orange-500'),
        documentStyle.getPropertyValue('--p-red-500')
        // Add more colors if there are more contributors
    ];
    const index = contributors.indexOf(contributor) % colors.length;
    return colors[index];
};

const openStatsDialog = (id) => {
    fetchRepositoryStats(id);
};

const customExportFunction = (cell) => {
    switch (cell.field) {
        case 'is_active':
            return cell.data ? 'Active' : 'Inactive';
        default:
            return cell.data;
    }
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const isTokenActive = (repository) => {
    const token = gitTokens.value.find((token) => token.id === repository.git_token_id);
    return token ? token.is_active : false;
};

const topContributor = computed(() => {
    const contributors = Object.entries(repositoryStats.value.contribution || {});
    if (!contributors.length) return 'N/A';

    const sortedContributors = contributors.sort((a, b) => {
        const totalAdditionsA = a[1].additions;
        const totalAdditionsB = b[1].additions;
        return totalAdditionsB - totalAdditionsA;
    });

    return sortedContributors[0][0]; // Return the username of the top contributor
});

const codebaseStability = computed(() => {
    if (!repositoryStats.value.churn_rates.length) return 'N/A';

    const totalChurnRate = repositoryStats.value.churn_rates.reduce((acc, curr) => acc + curr.churn_rate, 0);
    const totalCommits = repositoryStats.value.churn_rates.length;

    return (totalChurnRate / totalCommits).toFixed(2); // Average churn rate
});

const trimWeeklyStats = (weeklyStats) => {
    let start = 0;
    let end = weeklyStats.length;

    // Find the first non-empty array
    while (start < end && Object.keys(weeklyStats[start]).length === 0) {
        start++;
    }

    // Find the last non-empty array
    while (end > start && Object.keys(weeklyStats[end - 1]).length === 0) {
        end--;
    }

    // Return the trimmed array and the corresponding week numbers
    return {
        trimmedStats: weeklyStats.slice(start, end),
        startIndex: start
    };
};

const totalCommits = computed(() => {
    return repositoryStats.value.churn_rates ? repositoryStats.value.churn_rates.length : 0;
});

const totalChanges = computed(() => {
    if (!repositoryStats.value.churn_rates) return 0;

    return repositoryStats.value.churn_rates.reduce((acc, curr) => {
        return acc + curr.additions + Math.abs(curr.deletions);
    }, 0);
});

onMounted(() => {
    fetchRepositories(route.query.git_token_id);
});

watch([getPrimary, getSurface, isDarkTheme], () => {
    prepareChartData(); // Pass the documentStyle to reinitialize the charts
});

watch(route, (newRoute) => {
    if (!newRoute.query.git_token_id) {
        fetchRepositories();
    }
});
</script>

<template>
    <div class="pt-4">
        <h1 class="text-2xl font-bold mb-4">Manage Repositories</h1>

        <div v-if="route.query.git_token_id" class="mb-4">
            <Button label="Go Back" icon="pi pi-arrow-left" class="p-button-secondary" @click="$router.go(-1)" />
        </div>

        <div class="card">
            <Toolbar class="mb-6">
                <template #start v-if="!route.query.git_token_id">
                    <!-- Dropdown to select token (only shown when not filtering by token) -->
                    <Select v-model="selectedTokenId" :options="gitTokens" optionLabel="token" placeholder="Select a Token to filter repositories" class="w-full" @change="onTokenSelect" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                :value="filteredRepositories"
                dataKey="id"
                :exportFilename="`repositories_${new Date().getTime()}`"
                :exportFunction="customExportFunction"
                :paginator="true"
                :rows="10"
                :filters="filters"
                scrollable
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} repositories"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <div class="font-semibold text-xl mb-4">Repository List ({{ filteredRepositories.length !== 0 ? filteredRepositories.length : 'No repositories found' }})</div>
                        <InputText v-model="filters['global'].value" placeholder="Search..." />
                    </div>
                </template>

                <Column field="id" header="ID" sortable frozen style="min-width: 150px"></Column>
                <Column field="url" header="Repository" sortable style="min-width: 300px">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <a :href="slotProps.data.url" target="_blank" class="text-blue-500 underline">
                                <i class="pi pi-external-link" />
                            </a>
                            <router-link class="font-bold underline text-right text-primary ml-1" :to="`/repositories/${slotProps.data.id}/commits`">
                                <span v-tooltip="{ value: 'View Commits', hideDelay: 100 }" class="ml-1">{{ slotProps.data.owner }}/{{ slotProps.data.name }}</span>
                            </router-link>
                        </div>
                    </template>
                </Column>
                <Column field="name" header="Repository Name" sortable style="min-width: 150px"></Column>
                <Column field="owner" header="Owner" sortable style="min-width: 150px"></Column>
                <Column field="description" header="Description" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <span>{{ slotProps.data.description ? slotProps.data.description : 'No Description' }}</span>
                    </template>
                </Column>
                <Column field="created_at" header="Created At" sortable style="min-width: 150px"></Column>
                <Column field="last_fetched_at" header="Last Fetched" sortable style="min-width: 150px"></Column>
                <Column field="is_active" header="Status" sortable style="min-width: 150px">
                    <template #body="slotProps">
                        <Tag class="uppercase" :value="slotProps.data.is_active ? 'Active' : 'Inactive'" :severity="slotProps.data.is_active ? 'success' : 'danger'" />
                    </template>
                </Column>
                <Column header="Actions" alignFrozen="right" style="min-width: 150px" frozen :exportable="false">
                    <template #body="slotProps">
                        <div class="flex items-center">
                            <Button icon="pi pi-chart-line" class="mr-1" v-tooltip="{ value: 'View Analysis', hideDelay: 100 }" outlined rounded severity="info" @click="openStatsDialog(slotProps.data.id)" />
                            <Button :disabled="isTokenActive(slotProps.data)" icon="pi pi-trash" class="mr-1" outlined rounded severity="danger" @click="openConfirmation(slotProps.data.id)" />
                            <ToggleSwitch
                                v-model="slotProps.data.is_active"
                                v-tooltip="{ value: slotProps.data.is_active ? 'Deactivate this Token' : 'Activate this Token', hideDelay: 100 }"
                                class="ml-1"
                                @change="handleToggleChange(slotProps.data.id, slotProps.data.is_active)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <Dialog v-model:visible="displayConfirmation" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Are you sure you want to delete this token?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" severity="info" @click="closeConfirmation" />
                <Button label="Delete" icon="pi pi-check" severity="danger" @click="confirmDeletion" />
            </template>
        </Dialog>

        <Dialog v-model:visible="displayStatsDialog" :style="{ width: '90vw', backgroundColor: 'var(--surface-ground)' }" class="" header="Repository Analysis" :modal="true">
            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Total commits</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalCommits }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-github text-blue-500 !text-xl"></i>
                            </div>
                        </div>

                        <div class="flex">
                            <Tag class="mr-1" style="background: none" icon="pi pi-info-circle" severity="info" :rounded="true"></Tag>
                            <small class="text-muted-color"> The total number of commits made to the codebase. </small>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Codebase Stability</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ codebaseStability }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-shield text-orange-500 !text-xl"></i>
                            </div>
                        </div>

                        <div class="flex">
                            <Tag class="mr-1" style="background: none" icon="pi pi-info-circle" severity="info" :rounded="true"></Tag>
                            <small class="text-muted-color"> A higher number suggests greater volatility. </small>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Total Changes</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ totalChanges }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-file-edit text-cyan-500 !text-xl"></i>
                            </div>
                        </div>
                        <div class="flex">
                            <Tag class="mr-1" style="background: none" icon="pi pi-info-circle" severity="info" :rounded="true"></Tag>
                            <small class="text-muted-color"> The total number of changes made to the codebase. </small>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <div class="flex justify-between mb-4">
                            <div>
                                <span class="block text-muted-color font-medium mb-4">Top Contributor</span>
                                <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ topContributor }}</div>
                            </div>
                            <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                                <i class="pi pi-user text-purple-500 !text-xl"></i>
                            </div>
                        </div>
                        <div class="flex">
                            <Tag class="mr-1" style="background: none" icon="pi pi-info-circle" severity="info" :rounded="true"></Tag>
                            <small class="text-muted-color"> The user with the most contributions to the codebase. </small>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <!-- Combined Additions, Deletions, and Churn Rate Chart -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Additions, Deletions, and Churn Rate</div>
                        <Chart type="bar" :data="combinedChartData" :options="combinedChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This chart shows the number of additions and deletions made in each commit, along with the churn rate, providing insights into the code changes and their impact over time.</p>
                    </div>

                    <!-- Lead Time Chart -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Lead Time Metrics</div>
                        <Chart type="line" :data="leadTimeChartData" :options="leadTimeChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This chart shows the lead time for each commit, providing insights into the development pipeline's efficiency.</p>
                    </div>

                    <!-- New Score Chart -->
                    <div class="col-span-12 xl:col-span-6">
                        <div class="card">
                            <div class="font-semibold text-xl mb-4">Score Over Time</div>
                            <Chart type="line" :data="scoreChartData" :options="scoreChartOptions" class="h-[20rem]" />
                            <p class="mt-4 text-sm text-muted">This chart shows the score over time, providing insights into the changes in the score with each commit.</p>
                        </div>
                    </div>

                    <!-- Weekly Contribution Stats Chart -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Weekly Contribution Stats</div>
                        <Chart type="line" :data="weeklyStatsChartData" :options="weeklyStatsChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This chart shows the weekly contribution stats for each contributor, providing insights into contribution patterns over time.</p>
                    </div>
                </div>
                <div class="col-span-12 xl:col-span-6">
                    <!-- Contribution Chart -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Code Contribution Distribution</div>
                        <Chart type="pie" :data="contributionPieChartData" :options="contributionPieChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This pie chart shows the distribution of total code changes (additions and deletions) by each contributor.</p>
                    </div>

                    <!-- Contributor Contributions -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Contributor Contributions</div>
                        <Chart type="bar" :data="contributionChartData" :options="contributionChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This chart compares the contributions of different users in terms of additions and deletions.</p>
                    </div>

                    <!-- Lines of Code Chart -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Lines of Code by File Type</div>
                        <Chart type="bar" :data="linesOfCodeChartData" :options="linesOfCodeChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This chart shows the total lines of code contributed by each user for each file type.</p>
                    </div>

                    <!-- File Count Chart -->
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">File Count by File Type</div>
                        <Chart type="bar" :data="fileCountChartData" :options="fileCountChartOptions" class="h-[20rem]" />
                        <p class="mt-4 text-sm text-muted">This chart shows the total number of files contributed by each user for each file type.</p>
                    </div>
                </div>
            </div>
        </Dialog>
    </div>
</template>
