import { EditorState, Plugin, PluginKey } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser, DOMSerializer } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { exampleSetup } from "prosemirror-example-setup"
import { Decoration, DecorationSet } from "prosemirror-view"
import { ChangeSet } from "prosemirror-changeset"
import { recreateTransform } from "../../src"

// Prosemirror 的骨架对象, 定义了编辑器的各种规则来约束文档
const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks
})

// Prosemirror 的数据结构对象, 相当于是 react 的 state
let state = EditorState.create({
    // 编辑器初始内容
    doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content")),
    // 官方示例项目
    plugins: exampleSetup({
        schema: mySchema
    })
})

// Prosemirror 的视图对象, 其上有一些更新视图的方法, state 是其上一个属性: view.state
window.view = new EditorView(document.querySelector("#editor"), {
    state
})

// window.historyViews = []

// Show changes 按钮
document.getElementById('make_diff').addEventListener('click', () => {
    // state.doc是初始文档, view.state.doc是现在的文档
    let tr = recreateTransform(state.doc, view.state.doc, false, true)
    // 一个展示在 view 上的 document decorations（文档装饰器） 集合。
    let decos = DecorationSet.empty // decorations 的空集合。
    // https://prosemirror.xheldon.com/docs/ref/#transform.Mapping
    // 一个 mapping 表示 0 个或者更多个 step maps 的管道。为了能够无损的处理通过一系列 step 而产生的位置 mapping，
    // 其中一些 steps 很有可能是之前 step 的反转版本（这可能出现在为了协同编辑或者历史管理而 ‘rebasing’ step 的时候）因此有一些特殊的规定需要遵守。
    // 一个 maps 了 transform 中的每一个 steps 的 mapping。
    let changeSet = ChangeSet.create(state.doc).addSteps(tr.doc, tr.mapping.maps)
    let {startDoc, changes, simplifyChanges} = changeSet;

    changes.forEach(ccc => {
        // 添加的元素
        ccc.inserted.forEach(insertion => {
            decos = decos.add(tr.doc, [
                // 添加行内元素span, 添加class
                Decoration.inline(ccc.fromB, ccc.toB, {class: 'insertion'}, {})
            ])
        })

        // 删除的元素
        ccc.deleted.forEach(deletion => {
            let dom = document.createElement('span')
            // 添加行内元素span, 添加class
            dom.setAttribute('class', 'deletion')

            dom.appendChild(
                DOMSerializer.fromSchema(mySchema).serializeFragment(startDoc.slice(ccc.fromA, ccc.toA).content)
            )

            decos = decos.add(tr.doc, [
                // Decoration.widget({widget: dom, side: -1, marks: []}).range(deletion.from, deletion.to)
                Decoration.widget(ccc.toB, dom, { marks: [] })
            ])
        })
    })

    let historyState = EditorState.create({
        doc: tr.doc,
        plugins: [
            new Plugin({
                key: new PluginKey('diffs'),
                props: {
                    decorations(state) {
                        return decos
                    }
                },
                filterTransaction: tr => false
            })
        ]
    })
    // 新建一个div,
    let historyViewDiv = document.createElement('div')
    // 获取页面展示历史记录区域的id, 即#history
    let historyDiv = document.getElementById('history')

    // 将刚才新建的div添加到#history中
    historyDiv.insertBefore(historyViewDiv, historyDiv.firstElementChild)

    // 创建新的editorView, 展示差异
    new EditorView(historyViewDiv, {
        state: historyState
    })
    // window.historyViews.push()

    state = view.state;

})
