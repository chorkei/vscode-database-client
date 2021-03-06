<template>
  <el-dialog ref="editDialog" :title="editorTilte" :visible.sync="visible" width="90%" top="3vh" size="mini">
    <el-form ref="infoForm" :model="editModel" :inline="true">
      <el-form-item :prop="column.name" :key="column.name" v-for="column in columnList" size="mini">
        <template>
          <span>
            {{ column.name }} : {{ column.type }} &nbsp;
            <span style="color: red !important;">{{ column.key }}{{ column.nullable == 'YES' ? '' : ' NOT NULL' }}</span>&nbsp;
            <span>{{ column.defaultValue ? ` Default : ${column.defaultValue}` : "" }}</span>
            <span>{{ column.extra == "auto_increment" ? ` AUTO_INCREMENT` : "" }}</span>
          </span>
          <CellEditor v-if="editModel" v-model="editModel[column.name]" :type="column.type"></CellEditor>
        </template>
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="visible = false">Cancel</el-button>
      <el-button v-if="model=='update'" type="primary" :loading="loading" @click="confirmUpdate(editModel)">
        Update</el-button>
      <el-button v-if="model=='insert'||model=='copy'" type="primary" :loading="loading" @click="confirmInsert(editModel)">
        Insert</el-button>
    </span>
  </el-dialog>
</template>

<script>
import CellEditor from "./CellEditor.vue"
import { util } from "../mixin/util"
import { wrapByDb } from "@/common/wrapper"

export default {
  mixins: [util],
  components: { CellEditor },
  props: ["dbType", "table", "primaryKey", "columnList"],
  data() {
    return {
      model: "insert",
      originModel: {},
      editModel: {},
      visible: false,
      loading: false,
    }
  },
  methods: {
    openEdit(originModel) {
      if (!originModel) {
        this.$message.error("Edit row cannot be null!")
        return
      }
      this.originModel = originModel
      this.editModel = { ...originModel }
      this.model = "update"
      this.loading = false
      this.visible = true
    },
    openCopy(originModel) {
      if (!originModel) {
        this.$message.error("Edit row cannot be null!")
        return
      }
      this.originModel = originModel
      this.editModel = { ...originModel }
      this.editModel[this.primaryKey] = null
      this.model = "copy"
      this.loading = false
      this.visible = true
    },
    openInsert() {
      this.model = "insert"
      this.editModel = {}
      this.loading = false
      this.visible = true
    },
    close() {
      this.visible = false
    },
    getTypeByColumn(key) {
      if (!this.columnList) return
      for (const column of this.columnList) {
        if (column.name === key) {
          return column.simpleType || column.type
        }
      }
    },
    confirmInsert() {
      if (this.dbType == "ElasticSearch") {
        this.confirmInsertEs()
        return
      }
      let columns = ""
      let values = ""
      for (const key in this.editModel) {
        if (this.getTypeByColumn(key) == null) continue
        const newEle = this.editModel[key]
        if (newEle != null) {
          columns += `${wrapByDb(key, this.dbType)},`
          values += `${this.wrapQuote(this.getTypeByColumn(key), newEle)},`
        }
      }
      if (values) {
        const insertSql = `INSERT INTO ${this.table}(${columns.replace(/,$/, "")}) VALUES(${values.replace(/,$/, "")})`
        this.loading = true
        this.$emit("execute", insertSql)
      } else {
        this.$message("Not any input, insert fail!")
      }
    },
    confirmUpdate(row, oldRow) {
      if (oldRow) {
        this.originModel = oldRow
      }
      const currentNew = row ? row : this.editModel
      if (this.dbType == "ElasticSearch") {
        this.confirmUpdateEs(currentNew)
        return
      }
      if (!this.primaryKey) {
        this.$message.error("This table has not primary key, update fail!")
        return
      }
      const primary = this.originModel[this.primaryKey]
      let change = ""
      for (const key in currentNew) {
        if (this.getTypeByColumn(key) == null) continue
        const oldEle = this.originModel[key]
        const newEle = currentNew[key]
        if (oldEle !== newEle) {
          change += `${wrapByDb(key, this.dbType)}=${this.wrapQuote(this.getTypeByColumn(key), newEle)},`
        }
      }
      if (change) {
        const updateSql = `UPDATE ${this.table} SET ${change.replace(/,$/, "")} WHERE ${
          this.primaryKey
        }=${this.wrapQuote(this.getTypeByColumn(this.primaryKey), primary)}`
        this.$emit("execute", updateSql)
        this.loading = true
      } else {
        this.$message("Not any change, update fail!")
      }
    },
    confirmInsertEs() {
      this.$emit("execute", `POST /${this.table}/_doc\n` + JSON.stringify(this.editModel))
    },
    confirmUpdateEs(row) {
      let value = {}
      for (const key in row) {
        if (key == "_XID" || key == "_index" || key == "_type" || key == "_score" || key == "_id") {
          continue
        }
        value[key] = row[key]
      }
      this.$emit("execute", `POST /${this.table}/_doc/${row._id}\n` + JSON.stringify(value))
    },
  },
  computed: {
    editorTilte() {
      if (this.model == "insert") {
        return "Insert To " + this.table
      } else if (this.model == "update") {
        return "Edit For " + this.table + " : " + this.primaryKey + "=" + this.originModel[this.primaryKey]
      } else {
        return "Copy To " + this.table
      }
    },
  },
}
</script>

<style>
</style>