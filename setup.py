#!/usr/bin/env python3

import setuptools

with open('README.md', 'r') as f:
    long_description = f.read()

setuptools.setup(
    name='pydish',
    version=0.101,
    scripts=[],
    author='failsafe89',
    author_email='',
    description='No Dependency, cross platform, Display/Input driver shim for python3 using OpenGL (via websockets and webgl)',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/failsafe89/pydish',
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Development Status :: 3 - Alpha",
        "Environment :: Web Environment",
        "Natural Language :: English",
        "Topic :: Multimedia :: Graphics",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent"
    ],
    package_data = {
        '': [],
        'static': ['*.html', "*.js"],
    },
)