function foo() {
    return { foo: 'foo' };
}

function getBar() {
    return { bar: 'bar' };
}

const baz = () => 'baz';

function main() {
    const { foo: myFoo } = foo();
    const { bar } = getBar();
    const myBaz = baz();
}

export default main;
