import {
    EditorState,
    Plugin,
    PluginKey
} from "prosemirror-state"
import {
    EditorView
} from "prosemirror-view"
import {
    Schema,
    DOMParser,
    DOMSerializer
} from "prosemirror-model"
import {
    schema
} from "prosemirror-schema-basic"
import {
    addListNodes
} from "prosemirror-schema-list"
import {
    exampleSetup
} from "prosemirror-example-setup"
import {
    Decoration,
    DecorationSet
} from "prosemirror-view"

import {
    recreateSteps,
    mergeTransforms
} from "../src"

const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks
})

let state = EditorState.create({
    doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content")),
    plugins: exampleSetup({
        schema: mySchema
    })
})

window.view1 = new EditorView(document.querySelector("#editor1"), {
    state
})
window.view2 = new EditorView(document.querySelector("#editor2"), {
    state
})

document.getElementById('compare').addEventListener('click', () => {
    let tr1 = recreateSteps(state.doc, view1.state.doc)
    let tr2 = recreateSteps(state.doc, view2.state.doc)
    let {tr, changes} = mergeTransforms(state.doc, tr1, tr2)
    let decos = DecorationSet.empty
    changes.inserted.forEach(insertion => {
        decos = decos.add(tr.doc, [
            Decoration.inline(insertion.from, insertion.to, {class: `insertion user-${insertion.data.user}`}, {})
        ])
    })
    changes.deleted.forEach(deletion => {

        let dom = document.createElement('span')
        dom.setAttribute('class', `deletion user-${deletion.data.user}`)

        dom.appendChild(
            DOMSerializer.fromSchema(mySchema).serializeFragment(deletion.slice.content)
        )

        decos = decos.add(tr.doc, [
            Decoration.widget(deletion.pos, dom, {})
        ])
    })

    let mergedState = EditorState.create({
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

    window.view3 = new EditorView(document.querySelector("#editor3"), {
        state: mergedState
    })
})