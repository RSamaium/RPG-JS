<template>
    <Card>
        <div class="table-responsive">
            <table class="table table-centered table-nowrap mb-0 rounded">
                <thead class="thead-light">
                    <tr>
                        <th class="border-0" v-for="head in header" :key="head.key">{{ head.label }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, i) in items" :key="i">
                        <td class="border-0" v-for="head in header" :key="head.key">{{ item[head.key] }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </Card>
</template>

<script>
import Card from './Card'

export default {
    props: ['header', 'items'],

    components: {
        Card
    }
}
</script>