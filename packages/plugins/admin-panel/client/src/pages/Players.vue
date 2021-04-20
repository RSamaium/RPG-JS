<template>
    <div class="py-4">
        <div class="d-flex justify-content-between w-100 flex-wrap">
            <div class="mb-3 mb-lg-0">
                <h1 class="h4">Players</h1>
            </div>
        </div>
    </div>
    <Table :header="listHeader" :items="players" />
</template>

<script>
import Table from '../components/Table'

export default {
    data() {
       return  {
            listHeader: [
                { key: 'id', label: 'ID' },
                { key: 'map', label: 'Current Map' },
                { key: 'hp', label: 'Healt Point' },
                { key: 'level', label: 'Level' },
                { key: 'position', label: 'Position' }
            ]
       }
    },
    computed: {
        players() {
            return this.$store.state.players.players
        }
    },
    components: {
        Table
    }
}
</script>